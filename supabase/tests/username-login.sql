-- Executed by scripts/test-checkout-guard-db.mjs against its disposable PostgreSQL,
-- as the migration owner (admin). Data assertions for migration 202611180001:
-- username format CHECK, unique user_id and cascade on auth user delete.
-- Grants and RLS are asserted in the runner (JS).
do $$
declare
  v_user uuid := extensions.gen_random_uuid();
  v_other uuid := extensions.gen_random_uuid();
  v_bad text;
  v_count integer;
begin
  insert into auth.users(id) values (v_user), (v_other);
  insert into public.usernames(username, user_id) values ('ten_dang.nhap1', v_user);

  foreach v_bad in array array['ab', repeat('a', 33), 'Ten_Dang', 'ten-dang', 'ten dang', 'tên'] loop
    begin
      insert into public.usernames(username, user_id) values (v_bad, v_other);
      raise exception 'username % must be rejected by the CHECK', v_bad;
    exception when check_violation then null;
    end;
  end loop;

  begin
    insert into public.usernames(username, user_id) values ('another_name', v_user);
    raise exception 'duplicate user_id must be rejected';
  exception when unique_violation then null;
  end;

  delete from auth.users where id = v_user;
  select count(*) into v_count from public.usernames where user_id = v_user;
  if v_count <> 0 then raise exception 'deleting the auth user must cascade the username mapping'; end if;

  delete from auth.users where id = v_other;
end;
$$;

do $$ begin raise notice 'SENTINEL username-login.sql'; end $$;
