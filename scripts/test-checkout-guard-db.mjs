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
  const service = await connect("service_role");
  const user = randomUUID();
  await admin.query("insert into auth.users(id) values($1)", [user]);
  const result = await call(service, user);
  assert.equal(result.rows[0].total_vnd, 169000);
  console.log("real PostgreSQL migration/service-role smoke PASS");
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
