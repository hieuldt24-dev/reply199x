import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import path from "node:path";

const MAX_RATE = 50;
const MAX_DURATION = 30;
const MAX_IN_FLIGHT = 100;
const REQUEST_TIMEOUT_MS = 2000;
const VALID_BODY = JSON.stringify({ idempotencyKey: "00000000-0000-4000-8000-000000000001", attendee: { name: "Probe User", email: "probe@example.test" }, quantity: 1, merch: "none" });

export function parseLoopbackTarget(value) {
  const authority = /^http:\/\/([^/?#]*)/iu.exec(value)?.[1] ?? "";
  const rawAuthorityHost = authority.slice(authority.lastIndexOf("@") + 1);
  const rawHost = rawAuthorityHost.startsWith("[")
    ? rawAuthorityHost.slice(1, rawAuthorityHost.indexOf("]"))
    : rawAuthorityHost.split(":")[0];
  let url;
  try { url = new URL(value); } catch { throw new Error("--base-url must be a valid HTTP loopback URL"); }
  const host = url.hostname.replace(/^\[|\]$/gu, "").toLowerCase();
  if (url.protocol !== "http:" || url.username || url.password || rawHost.toLowerCase() !== host || !["localhost", "127.0.0.1", "::1"].includes(host)
    || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("--base-url must use HTTP and an exact localhost, 127.0.0.1, or [::1] host without credentials or path");
  }
  return url;
}

export function parseArgs(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const name = argv[index];
    if (!["--base-url", "--rate", "--duration"].includes(name) || values.has(name) || index + 1 >= argv.length) {
      throw new Error("Usage: node scripts/measure-ticket-order-ingress.mjs --base-url <loopback-url> --rate <1-50> --duration <1-30>");
    }
    values.set(name, argv[index + 1]);
    index += 1;
  }
  const baseUrl = parseLoopbackTarget(values.get("--base-url") ?? "");
  const rate = Number(values.get("--rate"));
  const durationSeconds = Number(values.get("--duration"));
  if (!Number.isInteger(rate) || rate < 1 || rate > MAX_RATE || !Number.isInteger(durationSeconds) || durationSeconds < 1 || durationSeconds > MAX_DURATION) {
    throw new Error("--rate must be 1-50 and --duration must be 1-30 seconds");
  }
  return { baseUrl, rate, durationSeconds };
}

function percentile(values, fraction) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  return Number(sorted[Math.ceil(fraction * sorted.length) - 1].toFixed(3));
}

async function fetchWithTimeout(fetchImpl, url, options, timeoutMs, onTimeout) {
  const controller = new AbortController();
  const timer = setTimeout(() => { onTimeout(); controller.abort(); }, timeoutMs);
  try { return await fetchImpl(url, { ...options, signal: controller.signal }); }
  finally { clearTimeout(timer); }
}

export async function runProbe({ baseUrl, rate, durationSeconds }, dependencies = {}) {
  const normalizedBase = baseUrl instanceof URL ? parseLoopbackTarget(baseUrl.toString()) : parseLoopbackTarget(String(baseUrl));
  if (!Number.isInteger(rate) || rate < 1 || rate > MAX_RATE || !Number.isInteger(durationSeconds) || durationSeconds < 1 || durationSeconds > MAX_DURATION) {
    throw new Error("--rate must be 1-50 and --duration must be 1-30 seconds");
  }
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const sleepImpl = dependencies.sleepImpl ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  const maxInFlight = dependencies.maxInFlight ?? MAX_IN_FLIGHT;
  const requestTimeoutMs = dependencies.requestTimeoutMs ?? REQUEST_TIMEOUT_MS;
  const readinessStartedAt = performance.now();
  let readinessTimedOut = false;
  let readinessStatus = 0;
  try {
    const response = await fetchWithTimeout(fetchImpl, new URL("/api/ticket-orders", normalizedBase), { method: "GET", redirect: "manual" }, requestTimeoutMs, () => { readinessTimedOut = true; });
    readinessStatus = response.status;
  } catch { /* Report readiness failure without exposing response data. */ }
  const readiness = { status: readinessStatus, ready: readinessStatus === 405, timeout: readinessTimedOut, elapsedMs: Number((performance.now() - readinessStartedAt).toFixed(3)) };
  if (!readiness.ready) {
    return { label: "unauthenticated_ingress_only", target: normalizedBase.origin, rate, durationSeconds, readiness, sent: 0, completed: 0, skipped: 0, statusDistribution: {}, redirectCount: 0, transportErrors: 0, timeouts: 0, failures: 1, latencyMs: { p50: 0, p95: 0, max: 0 } };
  }

  const totalScheduled = rate * durationSeconds;
  const statusDistribution = {};
  const latencies = [];
  const outstanding = new Set();
  let sent = 0;
  let skipped = 0;
  let redirectCount = 0;
  let transportErrors = 0;
  let timeouts = 0;
  let failures = 0;
  let inFlight = 0;
  const loadStartedAt = performance.now();

  for (let index = 0; index < totalScheduled; index += 1) {
    const scheduledAt = loadStartedAt + (index * 1000) / rate;
    const delay = scheduledAt - performance.now();
    if (delay > 0) await sleepImpl(delay);
    if (inFlight >= maxInFlight) {
      skipped += 1;
      failures += 1;
      continue;
    }

    sent += 1;
    inFlight += 1;
    const requestStartedAt = performance.now();
    let requestTimedOut = false;
    const task = (async () => {
      try {
        const response = await fetchWithTimeout(fetchImpl, new URL("/api/ticket-orders", normalizedBase), {
          method: "POST",
          redirect: "manual",
          headers: { "content-type": "application/json" },
          body: VALID_BODY,
        }, requestTimeoutMs, () => { requestTimedOut = true; });
        const elapsedMs = performance.now() - requestStartedAt;
        latencies.push(elapsedMs);
        statusDistribution[String(response.status)] = (statusDistribution[String(response.status)] ?? 0) + 1;
        if (response.status >= 300 && response.status < 400) redirectCount += 1;
        if (response.status !== 403 || (response.status >= 300 && response.status < 400)) failures += 1;
      } catch {
        if (requestTimedOut) timeouts += 1;
        else transportErrors += 1;
        failures += 1;
      } finally {
        inFlight -= 1;
        outstanding.delete(task);
      }
    })();
    outstanding.add(task);
  }

  await Promise.allSettled([...outstanding]);
  const maxLatency = latencies.length ? Number(Math.max(...latencies).toFixed(3)) : 0;
  return {
    label: "unauthenticated_ingress_only",
    target: normalizedBase.origin,
    rate,
    durationSeconds,
    readiness,
    sent,
    completed: latencies.length + timeouts + transportErrors,
    skipped,
    statusDistribution,
    redirectCount,
    transportErrors,
    timeouts,
    failures,
    latencyMs: { p50: percentile(latencies, 0.5), p95: percentile(latencies, 0.95), max: maxLatency },
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const summary = await runProbe(options);
  console.log(JSON.stringify(summary));
  if (!summary.readiness.ready || summary.skipped !== 0 || summary.transportErrors !== 0 || summary.timeouts !== 0 || summary.failures !== 0) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Ingress probe failed.");
    process.exitCode = 1;
  });
}
