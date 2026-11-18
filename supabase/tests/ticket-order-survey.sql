-- Executed by scripts/test-checkout-guard-db.mjs against its disposable PostgreSQL,
-- as the migration owner (admin). Data assertions for migration 202611170003:
-- CHECK constraints, composite owner FK, cascade, idempotent upsert, uniform P0002
-- ownership error (no oracle), get RPC shape and the synced-row requeue function.
-- Grants and role-based call attempts are asserted in the runner (JS).
do $$
declare
  v_owner uuid := extensions.gen_random_uuid();
  v_other uuid := extensions.gen_random_uuid();
  v_order uuid;
  v_other_order uuid;
  v_cascade_order uuid;
  v_unpaid_order uuid;
  v_nosurvey_order uuid;
  v_pending_order uuid;
  v_processing_order uuid;
  v_failed_order uuid;
  v_requeue_order uuid;
  v_state text;
  v_message text;
  v_missing_state text;
  v_missing_message text;
  v_count integer;
  v_created timestamptz;
  v_updated timestamptz;
  v_row record;
  v_case record;
begin
  insert into auth.users(id) values (v_owner), (v_other);

  -- Helper allowlist function, called directly.
  if not public.ticket_survey_source_valid(array['facebook','website']) then
    raise exception 'helper must accept a valid source set';
  end if;
  if not public.ticket_survey_source_valid(array['facebook','zalo','tiktok','referral','poster-standee','popup-reply199x','on-the-radio-bar','website']) then
    raise exception 'helper must accept all eight distinct sources';
  end if;
  for v_case in
    select * from (values
      ('null array', null::text[]),
      ('empty array', array[]::text[]),
      ('null element', array['facebook', null]),
      ('duplicate', array['facebook','facebook']),
      ('unknown id', array['facebook','instagram']),
      ('label instead of id', array['Facebook']),
      ('nine elements', array['facebook','zalo','tiktok','referral','poster-standee','popup-reply199x','on-the-radio-bar','website','facebook']),
      ('two dimensional', array[array['facebook','zalo']])
    ) as cases(label, value)
  loop
    if coalesce(public.ticket_survey_source_valid(v_case.value), true) then
      raise exception 'helper must reject %', v_case.label;
    end if;
  end loop;

  insert into public.orders(user_id, idempotency_key, request_fingerprint, quantity)
    values (v_owner, extensions.gen_random_uuid(), repeat('b', 64), 1) returning id into v_order;
  insert into public.orders(user_id, idempotency_key, request_fingerprint, quantity)
    values (v_other, extensions.gen_random_uuid(), repeat('b', 64), 1) returning id into v_other_order;

  -- CHECK constraints reject out-of-list data on direct insert (owner role).
  for v_case in
    select * from (values
      ('area out of list', array['facebook'], 'da-nang', 'confirmed', '23514'),
      ('attendance out of list', array['facebook'], 'hai-chau', 'maybe', '23514'),
      ('area label', array['facebook'], 'Hải Châu', 'confirmed', '23514'),
      ('empty source', array[]::text[], 'hai-chau', 'confirmed', '23514'),
      ('duplicate source', array['zalo','zalo'], 'hai-chau', 'confirmed', '23514'),
      ('unknown source', array['zalo','instagram'], 'hai-chau', 'confirmed', '23514'),
      ('null source element', array['zalo', null], 'hai-chau', 'confirmed', '23514'),
      ('nine sources', array['facebook','zalo','tiktok','referral','poster-standee','popup-reply199x','on-the-radio-bar','website','zalo'], 'hai-chau', 'confirmed', '23514'),
      ('null source', null::text[], 'hai-chau', 'confirmed', '23502'),
      ('null area', array['zalo'], null, 'confirmed', '23502'),
      ('null attendance', array['zalo'], 'hai-chau', null, '23502')
    ) as cases(label, source, area, attendance, expected)
  loop
    v_state := null;
    begin
      insert into public.ticket_order_survey(order_id, user_id, source, area, attendance)
        values (v_order, v_owner, v_case.source, v_case.area, v_case.attendance);
    exception when others then
      v_state := sqlstate;
    end;
    if v_state is distinct from v_case.expected then
      raise exception 'direct insert % expected SQLSTATE % but got %', v_case.label, v_case.expected, coalesce(v_state, 'success');
    end if;
  end loop;

  -- Composite FK: a survey cannot name an order with a user that does not own it.
  v_state := null;
  begin
    insert into public.ticket_order_survey(order_id, user_id, source, area, attendance)
      values (v_order, v_other, array['zalo'], 'hai-chau', 'confirmed');
  exception when others then
    v_state := sqlstate;
  end;
  if v_state is distinct from '23503' then
    raise exception 'wrong-owner direct insert expected 23503 but got %', coalesce(v_state, 'success');
  end if;
  if exists (select 1 from public.ticket_order_survey) then
    raise exception 'rejected inserts must not leave survey rows';
  end if;

  -- Upsert through the RPC; get returns zero rows before and one row after.
  select count(*) into v_count from public.get_ticket_order_survey(v_order);
  if v_count <> 0 then
    raise exception 'get must return zero rows for an order without a survey (got %)', v_count;
  end if;
  if public.upsert_ticket_order_survey(v_order, v_owner, array['facebook','website'], 'hai-chau', 'confirmed') is not true then
    raise exception 'first upsert must return true';
  end if;
  select s.created_at into v_created from public.ticket_order_survey s where s.order_id = v_order;
  update public.ticket_order_survey set updated_at = now() - interval '1 hour' where order_id = v_order;
  select s.updated_at into v_updated from public.ticket_order_survey s where s.order_id = v_order;
  if public.upsert_ticket_order_survey(v_order, v_owner, array['zalo'], 'cam-le', 'unsure') is not true then
    raise exception 'second upsert must return true';
  end if;
  select count(*) into v_count from public.ticket_order_survey s where s.order_id = v_order;
  if v_count <> 1 then
    raise exception 'two upserts for one order must keep exactly one row (got %)', v_count;
  end if;
  select s.* into v_row from public.ticket_order_survey s where s.order_id = v_order;
  if v_row.source <> array['zalo'] or v_row.area <> 'cam-le' or v_row.attendance <> 'unsure'
     or v_row.user_id <> v_owner or v_row.created_at <> v_created or v_row.updated_at <= v_updated then
    raise exception 'second upsert must overwrite answers, keep created_at and advance updated_at';
  end if;
  select count(*) into v_count from public.get_ticket_order_survey(v_order);
  if v_count <> 1 then
    raise exception 'get must return exactly one row after upsert (got %)', v_count;
  end if;
  select g.* into v_row from public.get_ticket_order_survey(v_order) g;
  if v_row.source <> array['zalo'] or v_row.area <> 'cam-le' or v_row.attendance <> 'unsure' then
    raise exception 'get must return the stored answers';
  end if;

  -- Upsert with invalid data is rejected by the CHECK even through the RPC.
  v_state := null;
  begin
    perform public.upsert_ticket_order_survey(v_order, v_owner, array['instagram'], 'hai-chau', 'confirmed');
  exception when others then
    v_state := sqlstate;
  end;
  if v_state is distinct from '23514' then
    raise exception 'upsert with an unknown source expected 23514 but got %', coalesce(v_state, 'success');
  end if;

  -- AC19: missing order and another user's order fail identically; table unchanged.
  select count(*) into v_count from public.ticket_order_survey;
  begin
    perform public.upsert_ticket_order_survey(extensions.gen_random_uuid(), v_owner, array['zalo'], 'hai-chau', 'confirmed');
  exception when others then
    v_missing_state := sqlstate;
    v_missing_message := sqlerrm;
  end;
  begin
    perform public.upsert_ticket_order_survey(v_other_order, v_owner, array['zalo'], 'hai-chau', 'confirmed');
  exception when others then
    v_state := sqlstate;
    v_message := sqlerrm;
  end;
  if v_missing_state is distinct from 'P0002' or v_state is distinct from 'P0002' then
    raise exception 'ownership failures must raise P0002 (missing %, foreign %)', coalesce(v_missing_state, 'success'), coalesce(v_state, 'success');
  end if;
  if v_missing_message is distinct from v_message then
    raise exception 'missing and foreign orders must share one error message';
  end if;
  if (select count(*) from public.ticket_order_survey) <> v_count
     or exists (select 1 from public.ticket_order_survey s where s.order_id = v_other_order) then
    raise exception 'rejected upserts must not change the survey table';
  end if;
  v_state := null;
  begin
    perform public.upsert_ticket_order_survey(v_order, null, array['zalo'], 'hai-chau', 'confirmed');
  exception when others then
    v_state := sqlstate;
  end;
  if v_state is distinct from 'P0002' then
    raise exception 'null user must raise P0002 (got %)', coalesce(v_state, 'success');
  end if;

  -- on delete cascade: deleting the order removes its survey.
  insert into public.orders(user_id, idempotency_key, request_fingerprint, quantity)
    values (v_owner, extensions.gen_random_uuid(), repeat('b', 64), 1) returning id into v_cascade_order;
  perform public.upsert_ticket_order_survey(v_cascade_order, v_owner, array['tiktok'], 'son-tra', 'confirmed');
  delete from public.orders where id = v_cascade_order;
  if exists (select 1 from public.ticket_order_survey s where s.order_id = v_cascade_order) then
    raise exception 'deleting an order must cascade to its survey';
  end if;

  -- Requeue function. Fixtures: a paid order with a PayOS link (claimable) and a
  -- synced outbox row, plus negative fixtures that must stay untouched.
  insert into public.orders(user_id, idempotency_key, request_fingerprint, quantity, status)
    values (v_owner, extensions.gen_random_uuid(), repeat('c', 64), 1, 'paid') returning id into v_requeue_order;
  insert into public.payos_payment_links(order_id, amount_vnd, currency, expires_at)
    values (v_requeue_order, 169000, 'VND', now() + interval '5 minutes');
  perform public.upsert_ticket_order_survey(v_requeue_order, v_owner, array['facebook'], 'hai-chau', 'confirmed');
  insert into public.sheet_sync_outbox(order_id, event_key, status, sheet_row_id, last_error_code, lease_until, lease_token, next_attempt_at, updated_at)
    values (v_requeue_order, 'paid', 'synced', 'Registrations!A2:Q2', 'old_error', now() + interval '1 hour', extensions.gen_random_uuid(), now() + interval '1 day', now() - interval '1 hour');

  insert into public.orders(user_id, idempotency_key, request_fingerprint, quantity)
    values (v_owner, extensions.gen_random_uuid(), repeat('c', 64), 1) returning id into v_unpaid_order;
  perform public.upsert_ticket_order_survey(v_unpaid_order, v_owner, array['facebook'], 'hai-chau', 'confirmed');
  insert into public.sheet_sync_outbox(order_id, event_key, status) values (v_unpaid_order, 'paid', 'synced');

  insert into public.orders(user_id, idempotency_key, request_fingerprint, quantity, status)
    values (v_owner, extensions.gen_random_uuid(), repeat('c', 64), 1, 'paid') returning id into v_nosurvey_order;
  insert into public.sheet_sync_outbox(order_id, event_key, status) values (v_nosurvey_order, 'paid', 'synced');

  insert into public.orders(user_id, idempotency_key, request_fingerprint, quantity, status)
    values (v_owner, extensions.gen_random_uuid(), repeat('c', 64), 1, 'paid') returning id into v_pending_order;
  perform public.upsert_ticket_order_survey(v_pending_order, v_owner, array['facebook'], 'hai-chau', 'confirmed');
  insert into public.sheet_sync_outbox(order_id, event_key, status, next_attempt_at) values (v_pending_order, 'paid', 'pending', now() + interval '1 day');

  insert into public.orders(user_id, idempotency_key, request_fingerprint, quantity, status)
    values (v_owner, extensions.gen_random_uuid(), repeat('c', 64), 1, 'paid') returning id into v_processing_order;
  perform public.upsert_ticket_order_survey(v_processing_order, v_owner, array['facebook'], 'hai-chau', 'confirmed');
  insert into public.sheet_sync_outbox(order_id, event_key, status, lease_until, lease_token, next_attempt_at)
    values (v_processing_order, 'paid', 'processing', now() + interval '1 hour', extensions.gen_random_uuid(), now() + interval '1 day');

  insert into public.orders(user_id, idempotency_key, request_fingerprint, quantity, status)
    values (v_owner, extensions.gen_random_uuid(), repeat('c', 64), 1, 'paid') returning id into v_failed_order;
  perform public.upsert_ticket_order_survey(v_failed_order, v_owner, array['facebook'], 'hai-chau', 'confirmed');
  insert into public.sheet_sync_outbox(order_id, event_key, status, last_error_code, next_attempt_at)
    values (v_failed_order, 'paid', 'failed', 'sheet_write_failed', now() + interval '1 day');

  create temporary table survey_requeue_before on commit drop as
    select s.order_id, s.status::text as status, s.next_attempt_at, s.lease_until, s.lease_token, s.last_error_code, s.updated_at
    from public.sheet_sync_outbox s
    where s.order_id in (v_unpaid_order, v_nosurvey_order, v_pending_order, v_processing_order, v_failed_order);

  for v_case in
    select * from (values
      ('unpaid order', v_unpaid_order),
      ('paid order without survey', v_nosurvey_order),
      ('pending outbox row', v_pending_order),
      ('processing outbox row', v_processing_order),
      ('failed outbox row', v_failed_order),
      ('missing order', extensions.gen_random_uuid())
    ) as cases(label, order_id)
  loop
    if public.requeue_synced_sheet_sync_for_survey(v_case.order_id) is not false then
      raise exception 'requeue must return false for %', v_case.label;
    end if;
  end loop;
  if exists (
    select 1 from survey_requeue_before b
    join public.sheet_sync_outbox s on s.order_id = b.order_id and s.event_key = 'paid'
    where s.status::text <> b.status
       or s.next_attempt_at is distinct from b.next_attempt_at
       or s.lease_until is distinct from b.lease_until
       or s.lease_token is distinct from b.lease_token
       or s.last_error_code is distinct from b.last_error_code
       or s.updated_at is distinct from b.updated_at
  ) then
    raise exception 'requeue must not change outbox rows in negative cases';
  end if;
  if (select count(*) from survey_requeue_before) <> 5 then
    raise exception 'requeue negative fixtures are incomplete';
  end if;

  if public.requeue_synced_sheet_sync_for_survey(v_requeue_order) is not true then
    raise exception 'requeue must return true for a synced paid order with a survey';
  end if;
  select s.* into v_row from public.sheet_sync_outbox s where s.order_id = v_requeue_order and s.event_key = 'paid';
  if v_row.status::text <> 'pending' or v_row.next_attempt_at > now() or v_row.lease_until is not null
     or v_row.lease_token is not null or v_row.last_error_code is not null or v_row.updated_at <> now() then
    raise exception 'requeue must reset the row to pending, due now, without lease or error';
  end if;
  if public.requeue_synced_sheet_sync_for_survey(v_requeue_order) is not false then
    raise exception 'requeue of an already pending row must return false';
  end if;
  select count(*) into v_count from public.claim_paid_ticket_sheet_sync(50) c where c.order_id = v_requeue_order;
  if v_count <> 1 then
    raise exception 'claim_paid_ticket_sheet_sync must pick up the requeued row (got %)', v_count;
  end if;
end;
$$;

do $$ begin raise notice 'SENTINEL ticket-order-survey.sql'; end $$;
