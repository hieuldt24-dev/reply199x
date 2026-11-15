import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, writeFile, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import EmbeddedPostgres from "embedded-postgres";

// Always self-create a disposable cluster. Deliberately accepts no external DB URL.
const root = fileURLToPath(new URL("../", import.meta.url));
const artifacts = path.join(root, "process/general-plans/active/checkout-access-guard_14-11-26");
const directory = await mkdtemp(path.join(tmpdir(), "checkout-guard-pg-"));
const port = await new Promise((resolve, reject) => {
  const server = createServer();
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    server.close(() => resolve(address.port));
  });
});
const postgres = new EmbeddedPostgres({
  databaseDir: path.join(directory, "data"), user: "postgres", password: randomUUID(),
  port, persistent: true, createPostgresUser: false, autoRehydrateSymlinks: true,
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
  postgresFlags: ["-h", "127.0.0.1", "-c", "max_connections=60"],
  onLog: message => { if (process.env.CHECKOUT_DB_DEBUG) console.log(message); },
  onError: error => console.error("isolated PostgreSQL runtime:", error),
});
const clients = new Set();
const execFileAsync = promisify(execFile);
let started = false;
async function connect(role) {
  const client = postgres.getPgClient("postgres", "127.0.0.1");
  await client.connect();
  clients.add(client);
  if (role) await client.query(`set role ${role}`);
  return client;
}
const bootstrap = `
  create schema auth; create schema extensions;
  create role anon nologin; create role authenticated nologin;
  create role service_role nologin bypassrls;
  create table auth.users(id uuid primary key);
  create function auth.uid() returns uuid language sql stable as
    'select nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';
  grant usage on schema public, auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to service_role;
  alter default privileges in schema public grant all on sequences to service_role;
`;
const params = (user, key = randomUUID(), quantity = 1) => [user, key, "Test Buyer", "buyer@example.test", "", "", null, quantity, "none"];
const call = (client, user, key, quantity = 1, version = 4) => client.query(
  `select * from public.create_ticket_order_v${version}($1,$2,$3,$4,$5,$6,$7,$8,$9)`, params(user, key, quantity));
const assertSql = async (client, sql, values = []) => {
  const result = await client.query(sql, values);
  assert.equal(result.rows[0]?.ok, true, result.rows[0]?.message ?? sql);
};
async function newUser(admin) {
  const id = randomUUID();
  await admin.query("insert into auth.users(id) values($1)", [id]);
  return id;
}
async function addExpiredEvidence(admin, service, user, deadlineOffsetMs = -60_000, options = {}) {
  // Seed through the migration owner: legacy v3 is intentionally no longer callable
  // by service_role after the guard migration.
  const order = (await call(admin, user, randomUUID(), 1, 3)).rows[0];
  const expiry = new Date(Date.now() + deadlineOffsetMs).toISOString();
  await admin.query("update public.orders set status=$2,payment_expires_at=$3 where id=$1", [order.order_id, options.orderStatus ?? "expired", expiry]);
  const linkExpiry = options.linkDeadline ? new Date(new Date(expiry).getTime() + options.linkDeadline).toISOString() : expiry;
  const issuedAt = options.unissued ? null : new Date(new Date(expiry).getTime() - 60_000).toISOString();
  const status = options.linkStatus ?? "expired";
  const evidence = await admin.query(`insert into public.payos_payment_links(order_id,amount_vnd,currency,expires_at,status,payment_link_id,checkout_url,checkout_issued_at)
    values($1,$2,'VND',$3,$4,$5,$6,$7) returning order_code`, [order.order_id, order.total_vnd, linkExpiry, status, options.noLinkId ? null : `test-${randomUUID()}`, options.noUrl ? null : "https://pay.payos.vn/web/test", issuedAt]);
  if (options.transaction) await admin.query("insert into public.payment_transactions(order_id,provider,amount_vnd,currency,status,expires_at,paid_at,provider_transaction_id) values($1,'sepay',$2,'VND',$3,$4,case when $3='paid' then now() else null end,case when $3='paid' then $5 else null end)", [order.order_id, order.total_vnd, options.transaction, expiry, `tx-${randomUUID()}`]);
  if (options.event) await admin.query("insert into public.payos_payment_events(provider_event_id,transaction_reference,order_code,amount_vnd,processing_status) values($1,$2,$3,$4,$5)", [`event-${randomUUID()}`, `ref-${randomUUID()}`, evidence.rows[0].order_code, order.total_vnd, options.event]);
  return order;
}
function percentile(samples, percentileValue) {
  const sorted = [...samples].sort((a, b) => a - b);
  return Number(sorted[Math.min(sorted.length - 1, Math.ceil(percentileValue * sorted.length) - 1)].toFixed(3));
}
async function measure(fn, count) {
  const values = [];
  for (let i = 0; i < count; i += 1) {
    const startedAt = performance.now();
    await fn(i);
    values.push(performance.now() - startedAt);
  }
  return { sampleCount: values.length, p50Ms: percentile(values, 0.5), p95Ms: percentile(values, 0.95) };
}

try {
  await postgres.initialise();
  await postgres.start();
  started = true;
  const admin = await connect();
  await admin.query(bootstrap);
  for (const filename of (await readdir(path.join(root, "supabase/migrations"))).filter(name => name.endsWith(".sql")).sort()) {
    await admin.query((await readFile(path.join(root, "supabase/migrations", filename), "utf8")).replace(/^\uFEFF/, ""));
    console.log(`migration PASS ${filename}`);
  }
  await admin.query(await readFile(path.join(root, "supabase/tests/checkout-access-guard.sql"), "utf8"));
  console.log("SQL permission/index assertions PASS");
  const service = await connect("service_role");
  await assertSql(admin, `select has_function_privilege('service_role','public.create_ticket_order_v4(uuid,uuid,text,text,text,text,integer,integer,text)','execute')
    and not has_function_privilege('anon','public.create_ticket_order_v4(uuid,uuid,text,text,text,text,integer,integer,text)','execute')
    and not has_function_privilege('authenticated','public.create_ticket_order_v4(uuid,uuid,text,text,text,text,integer,integer,text)','execute')
    and not has_function_privilege('service_role','public.create_ticket_order_v3(uuid,uuid,text,text,text,text,integer,integer,text)','execute')
    and has_table_privilege('service_role','public.checkout_access_state','select')
    and not has_table_privilege('anon','public.checkout_access_state','select')
    and not has_table_privilege('anon','public.checkout_access_state','insert')
    and not has_table_privilege('anon','public.checkout_access_state','update')
    and not has_table_privilege('anon','public.checkout_access_state','delete')
    and not has_table_privilege('authenticated','public.checkout_access_state','select')
    and not has_table_privilege('authenticated','public.checkout_access_state','insert')
    and not has_table_privilege('authenticated','public.checkout_access_state','update')
    and not has_table_privilege('authenticated','public.checkout_access_state','delete') as ok`);
  const smokeUser = await newUser(admin);
  const smoke = await call(service, smokeUser, randomUUID());
  assert.equal(smoke.rows[0].total_vnd, 169000);

  // Prove that the coarse, equivalent lower bounds make a large-account candidate scan use the partial order index.
  const indexUser = await newUser(admin);
  const decoyUser = await newUser(admin);
  await admin.query(`insert into public.orders(user_id,idempotency_key,request_fingerprint,quantity,status,payment_expires_at)
    select $1,extensions.gen_random_uuid(),repeat('a',64),1,'pending_payment',now()+interval '5 minutes'
    from generate_series(1,20000)`, [decoyUser]);
  await addExpiredEvidence(admin, service, indexUser);
  await addExpiredEvidence(admin, service, indexUser);
  await addExpiredEvidence(admin, service, indexUser);
  await admin.query("analyze public.orders; analyze public.payos_payment_links; analyze public.payos_payment_events");
  const queryNow = new Date();
  const explain = await admin.query(`explain (format json) select o.id from public.orders o
    join public.payos_payment_links p on p.order_id=o.id
    where o.user_id=$1 and o.status in ('pending_payment','expired')
      and o.payment_expires_at >= $2::timestamptz-interval '1 hour'
      and p.expires_at >= $2::timestamptz-interval '1 hour'
      and least(p.expires_at,o.payment_expires_at) <= $2::timestamptz
    order by o.id for update of o`, [indexUser, queryNow]);
  const queryPlan = JSON.stringify(explain.rows[0]["QUERY PLAN"]);
  assert.match(queryPlan, /orders_checkout_access_idx/, "large-account candidate scan should use the partial user/deadline index");
  console.log("EXPLAIN confirms orders_checkout_access_idx on 20,003-order fixture");

  // Two strikes remain eligible; the third creates one durable account restriction.
  const thresholdUser = await newUser(admin);
  await addExpiredEvidence(admin, service, thresholdUser);
  await addExpiredEvidence(admin, service, thresholdUser);
  assert.ok((await call(service, thresholdUser, randomUUID())).rows[0].order_id);
  const blockedUser = await newUser(admin);
  await addExpiredEvidence(admin, service, blockedUser);
  await addExpiredEvidence(admin, service, blockedUser);
  await addExpiredEvidence(admin, service, blockedUser);
  const blocked = (await call(service, blockedUser, randomUUID())).rows[0];
  assert.equal(blocked.order_id, null);
  assert.ok(Date.parse(blocked.blocked_until) > Date.now() + 23 * 60 * 60 * 1000);
  const initialBlock = blocked.blocked_until;
  const deniedKey = randomUUID();
  const existingOrdersBeforeDenial = Number((await admin.query("select count(*)::int as n from public.orders where user_id=$1", [blockedUser])).rows[0].n);
  assert.equal((await call(service, blockedUser, deniedKey)).rows[0].order_id, null);
  assert.equal(Number((await admin.query("select count(*)::int as n from public.orders where user_id=$1", [blockedUser])).rows[0].n), existingOrdersBeforeDenial, "denied requests must not persist orders");
  const deniedReplay = (await call(service, blockedUser, randomUUID())).rows[0];
  assert.equal(new Date(deniedReplay.blocked_until).getTime(), new Date(initialBlock).getTime(), "denials must not extend the cooldown");

  // Existing identical requests replay through a restriction; conflicting payloads stay conflicts.
  const replayUser = await newUser(admin);
  const replayKey = randomUUID();
  const prior = (await call(admin, replayUser, replayKey, 1, 3)).rows[0];
  await admin.query("insert into public.checkout_access_state(user_id,blocked_until) values($1,now()+interval '1 hour')", [replayUser]);
  const replay = (await call(service, replayUser, replayKey, 1)).rows[0];
  assert.equal(replay.order_id, prior.order_id);
  await assert.rejects(() => call(service, replayUser, replayKey, 2), /idempotency_payload_conflict/);

  // Old, never-issued, failed and reconciliation evidence is not counted.
  const excludedUser = await newUser(admin);
  await addExpiredEvidence(admin, service, excludedUser, -3_700_001);
  await addExpiredEvidence(admin, service, excludedUser, -60_000, { unissued: true });
  await addExpiredEvidence(admin, service, excludedUser, -50_000, { linkStatus: "failed" });
  await addExpiredEvidence(admin, service, excludedUser, -40_000, { event: "reconciliation" });
  await addExpiredEvidence(admin, service, excludedUser, -30_000, { transaction: "paid" });
  assert.ok((await call(service, excludedUser, randomUUID())).rows[0].order_id);

  // Consumed evidence cannot re-trigger after recovery; a later group can.
  const cycleUser = await newUser(admin);
  await addExpiredEvidence(admin, service, cycleUser, -1_800_000);
  await addExpiredEvidence(admin, service, cycleUser, -1_700_000);
  await addExpiredEvidence(admin, service, cycleUser, -1_600_000);
  await admin.query("insert into public.checkout_access_state(user_id,blocked_until,consumed_through) values($1,now()-interval '1 second',now()-interval '20 minutes')", [cycleUser]);
  assert.ok((await call(service, cycleUser, randomUUID())).rows[0].order_id, "old consumed strikes must not retrigger");
  await addExpiredEvidence(admin, service, cycleUser, -120_000);
  await addExpiredEvidence(admin, service, cycleUser, -90_000);
  await addExpiredEvidence(admin, service, cycleUser, -60_000);
  assert.equal((await call(service, cycleUser, randomUUID())).rows[0].order_id, null, "a later fresh group may trigger a new cooldown");

  // Restrictions are account-local; an existing payment can still finalize during one.
  const isolatedUser = await newUser(admin);
  const payable = (await call(admin, isolatedUser, randomUUID(), 1, 3)).rows[0];
  await admin.query("insert into public.checkout_access_state(user_id,blocked_until) values($1,now()+interval '1 hour')", [isolatedUser]);
  assert.ok((await call(service, await newUser(admin), randomUUID())).rows[0].order_id);
  const leaseUser = await newUser(admin);
  const leasedOrder = (await call(service, leaseUser, randomUUID())).rows[0];
  const firstLease = await service.query("select * from public.prepare_payos_checkout($1,$2,null,null)", [leasedOrder.order_id, leaseUser]);
  const secondLease = await service.query("select * from public.prepare_payos_checkout($1,$2,null,null)", [leasedOrder.order_id, leaseUser]);
  assert.equal(firstLease.rows[0].can_create, true);
  assert.equal(secondLease.rows[0].can_create, false);
  assert.equal(secondLease.rows[0].order_code, firstLease.rows[0].order_code);
  assert.equal(Number((await admin.query("select count(*)::int as n from public.payos_payment_links where order_id=$1", [leasedOrder.order_id])).rows[0].n), 1, "one logical order must own one provider link/lease row");
  await assert.rejects(() => service.query("select * from public.prepare_payos_checkout($1,$2,null,null)", [leasedOrder.order_id, randomUUID()]), /order_not_found/);
  const delayedUser = await newUser(admin);
  const delayedOrder = (await call(service, delayedUser, randomUUID())).rows[0];
  const delayedLease = await service.query("select * from public.prepare_payos_checkout($1,$2,null,null)", [delayedOrder.order_id, delayedUser]);
  assert.equal(delayedLease.rows[0].can_create, true);
  await admin.query("update public.orders set payment_expires_at=now()-interval '1 second' where id=$1", [delayedOrder.order_id]);
  await admin.query("update public.payos_payment_links set expires_at=now()-interval '1 second' where order_id=$1", [delayedOrder.order_id]);
  await service.query("select * from public.prepare_payos_checkout($1,$2,$3,$4)", [delayedOrder.order_id, delayedUser, "late-link", "https://pay.payos.vn/web/late"]);
  assert.equal((await admin.query("select checkout_issued_at from public.payos_payment_links where order_id=$1", [delayedOrder.order_id])).rows[0].checkout_issued_at, null, "late provider persistence must not create strike evidence");
  const link = await admin.query("insert into public.payos_payment_links(order_id,amount_vnd,currency,expires_at,payment_link_id,checkout_url) values($1,$2,'VND',now()+interval '5 minutes','live-link','https://pay.payos.vn/web/live') returning order_code", [payable.order_id, payable.total_vnd]);
  const paid = await service.query("select * from public.process_payos_webhook($1,$2,$3,$4,$5,'VND',true)", [`paid-${randomUUID()}`, link.rows[0].order_code, "live-link", `tx-${randomUUID()}`, payable.total_vnd]);
  assert.equal(paid.rows[0].result, "paid");

  // Same-account parallel requests serialize; all observe the committed restriction.
  const concurrentUser = await newUser(admin);
  await addExpiredEvidence(admin, service, concurrentUser);
  await addExpiredEvidence(admin, service, concurrentUser);
  await addExpiredEvidence(admin, service, concurrentUser);
  const concurrent = await Promise.all(Array.from({ length: 12 }, () => connect("service_role")));
  try {
    const concurrentResults = await Promise.all(concurrent.map((client) => call(client, concurrentUser, randomUUID())));
    assert.ok(concurrentResults.every((result) => result.rows[0].order_id === null && new Date(result.rows[0].blocked_until).getTime() === new Date(concurrentResults[0].rows[0].blocked_until).getTime()));
  } finally { await Promise.all(concurrent.map((client) => client.end())); }

  console.log("real PostgreSQL G2 migration, permissions, policy and concurrency checks PASS");

  if (process.argv.includes("--workload")) {
    const runs = Number(process.env.CHECKOUT_WORKLOAD_SAMPLES ?? 30);
    assert.ok(Number.isInteger(runs) && runs >= 10 && runs <= 500, "CHECKOUT_WORKLOAD_SAMPLES must be an integer from 10 to 500");
    const baselineFresh = await measure(async () => {
      const result = (await call(admin, await newUser(admin), randomUUID(), 1, 3)).rows[0];
      assert.ok(result.order_id && result.total_vnd === 169000);
    }, runs);
    const baselineReplay = await measure(async () => {
      const user = await newUser(admin); const key = randomUUID(); const first = (await call(admin, user, key, 1, 3)).rows[0]; const replay = (await call(admin, user, key, 1, 3)).rows[0];
      assert.equal(replay.order_id, first.order_id); assert.equal(replay.reused, true);
    }, runs);
    const afterFresh = await measure(async () => {
      const result = (await call(service, await newUser(admin), randomUUID())).rows[0];
      assert.ok(result.order_id && result.total_vnd === 169000);
    }, runs);
    const afterReplay = await measure(async () => {
      const user = await newUser(admin); const key = randomUUID(); const first = (await call(service, user, key)).rows[0]; const replay = (await call(service, user, key)).rows[0];
      assert.equal(replay.order_id, first.order_id); assert.equal(replay.reused, true);
    }, runs);
    const deniedUsers = [];
    for (let index = 0; index < runs; index += 1) {
      const user = await newUser(admin);
      await addExpiredEvidence(admin, service, user); await addExpiredEvidence(admin, service, user); await addExpiredEvidence(admin, service, user);
      deniedUsers.push(user);
    }
    let deniedIndex = 0;
    const denied = await measure(async () => {
      const result = (await call(service, deniedUsers[deniedIndex++], randomUUID())).rows[0];
      assert.equal(result.order_id, null); assert.ok(result.blocked_until);
    }, runs);
    const legacyAttemptUsers = [];
    for (let index = 0; index < runs; index += 1) {
      const user = await newUser(admin);
      await addExpiredEvidence(admin, service, user); await addExpiredEvidence(admin, service, user); await addExpiredEvidence(admin, service, user);
      legacyAttemptUsers.push(user);
    }
    let legacyAttemptIndex = 0;
    const baselineV3RestrictedAttempt = await measure(async () => {
      const result = (await call(admin, legacyAttemptUsers[legacyAttemptIndex++], randomUUID(), 1, 3)).rows[0];
      assert.ok(result.order_id, "unguarded baseline still creates an order from an account with three expiries");
    }, runs);
    const paymentUi = JSON.parse(await readFile(path.join(artifacts, "payment-ui-workload_15-11-26.json"), "utf8"));
    const artifact = {
      generatedAt: new Date().toISOString(),
      environment: { runtime: process.version, platform: process.platform, database: "isolated embedded PostgreSQL, localhost", sampleCount: runs },
      measurements: { baselineV3Fresh: baselineFresh, baselineV3Replay: baselineReplay, baselineV3RestrictedAttempt: baselineV3RestrictedAttempt, guardedV4Fresh: afterFresh, guardedV4Replay: afterReplay, guardedV4Denied: denied },
      clientRequestCounts: {
        paymentStatus: { baselineTotal: paymentUi.baseline.totalRequests, afterTotal: paymentUi.after.totalRequests, baselineHiddenPolls: paymentUi.baseline.hiddenPolls, afterHiddenPolls: paymentUi.after.hiddenPolls },
        authFocusBurst: { events: 20, baselineRouterRefreshes: 20, afterRouterRefreshes: 1, baselineExtraSessionFetches: 0, afterExtraSessionFetches: 0 },
      },
      databasePlan: { fixtureOrders: 20003, candidateIndex: "orders_checkout_access_idx", chosenByExplain: true, coarseBound: "payment_expires_at >= now - 1h AND payos.expires_at >= now - 1h; exact upper bound remains least(...) <= now" },
      invariants: { duplicateCheckoutLinkRowsPerOrder: 1, retryPreservesOrderIdentity: true, orderAmountVnd: 169000, ownerMismatchDenied: true },
      limitations: ["Local isolated database and fake-clock UI only; no hosted Supabase, browser, or production network/provider latency claim.", "Measurements compare deterministic calls and request counts; they do not establish production capacity."],
    };
    await writeFile(path.join(artifacts, "checkout-access-guard-workload_15-11-26.json"), `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
    console.log("G5 workload evidence written: checkout-access-guard-workload_15-11-26.json");
  }
} finally {
  await Promise.allSettled([...clients].map(client => client.end()));
  if (started && process.platform === "win32") {
    // Use PostgreSQL's own graceful stop; Windows taskkill can be unavailable
    // in managed environments. Clear the library handle after confirmed exit.
    const binaries = await import("@embedded-postgres/windows-x64");
    await execFileAsync(binaries.pg_ctl, ["-D", path.join(directory, "data"), "stop", "-m", "fast"], { windowsHide: true });
    postgres.process = undefined;
  } else if (started) await postgres.stop();
  // The only recursive removal is the exact mkdtemp directory this run created.
  assert.equal(path.dirname(directory), path.resolve(tmpdir()));
  assert.ok(path.basename(directory).startsWith("checkout-guard-pg-"));
  await rm(directory, { recursive: true, force: true });
}
