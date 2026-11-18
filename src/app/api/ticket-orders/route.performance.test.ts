import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

const { getUser, rpc, createClient, createPayOsPaymentLink, lookupPayOsPaymentLink } = vi.hoisted(() => ({
  getUser: vi.fn(),
  rpc: vi.fn(),
  createClient: vi.fn(),
  createPayOsPaymentLink: vi.fn(),
  lookupPayOsPaymentLink: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser } }) }));
vi.mock("@supabase/supabase-js", () => ({ createClient }));
vi.mock("@/lib/payments/payos/checkout", () => ({
  createPayOsPaymentLink,
  getPayOsConfig: () => ({ clientId: "benchmark-client", apiKey: "benchmark-key", checksumKey: "benchmark-checksum" }),
  lookupPayOsPaymentLink,
  payOsErrorDiagnostic: () => ({ code: "benchmark_error" }),
}));

const taskFolder = "process/general-plans/active/ticket-order-survey_17-11-26";
const baselinePath = resolve(process.cwd(), `${taskFolder}/ticket-order-survey_BASELINE_17-11-26.json`);
const candidatePath = resolve(process.cwd(), `${taskFolder}/ticket-order-survey_CANDIDATE_17-11-26.json`);
const allowedBaselines = [
  `${taskFolder}/ticket-order-survey_BASELINE_17-11-26.json`,
  `${taskFolder}/ticket-order-survey_BASELINE_R2_17-11-26.json`,
];
// Immutable evidence from the earlier checkout-performance task: read-only, never written.
// Checked by a SHA-256 of its LF-normalized content, so a Windows autocrlf checkout (CRLF) still
// matches while any other byte change fails. The file may move from active/ to completed/ on archive.
const oldBaselineRelative = "ticket-checkout-performance_17-11-26/ticket-checkout-performance_BASELINE_17-11-26.json";
const oldBaselineCandidates = [
  resolve(process.cwd(), `process/general-plans/active/${oldBaselineRelative}`),
  resolve(process.cwd(), `process/general-plans/completed/${oldBaselineRelative}`),
];
// Pinned hash of the LF form of the file content.
const OLD_BASELINE_SHA256 = "da3ca2c76765ce6315fb3bc03dc9d75821a8a7027164e662e515fa2fbd17877e";
const routePath = resolve(process.cwd(), "src/app/api/ticket-orders/route.ts");
const userId = "7d444840-9dc0-4e22-a132-5a1ae8a4f1d0";
const orderId = "a3d9df10-fc46-4f23-8d73-96fe71ad9465";
const rpcDelayMs = 15;
const payosDelayMs = 30;
const warmupCount = 5;
const sampleCount = 50;
const fixtureVersion = "fresh-payable-checkout-survey-v1";
const SERIAL_RPCS = new Set(["create_ticket_order_v5", "prepare_payos_checkout"]);
const SURVEY_RPC = "upsert_ticket_order_survey";
const requestVector = Array.from({ length: sampleCount }, (_, index) => ({
  idempotencyKey: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
  name: "Nguyen An",
  email: "an@example.com",
  phone: "",
  gender: "",
  birthYear: null,
  quantity: 1,
  merch: "none",
  survey: { source: ["facebook", "website"], area: "hai-chau", attendance: "confirmed" },
}));
const vectorDigest = createHash("sha256").update(JSON.stringify(requestVector)).digest("hex");

type Measurement = {
  elapsedMs: number;
  status: number;
  serialRpcCount: number;
  surveyRpcCount: number;
  totalRpcCount: number;
  surveyStartedBeforePayosEnd: boolean | null;
};

let surveyStartedAt: number | null = null;
let payosEndedAt: number | null = null;

function percentile(values: number[], fraction: number) {
  const sorted = [...values].sort((a, b) => a - b);
  return Number(sorted[Math.ceil(fraction * sorted.length) - 1]?.toFixed(3) ?? 0);
}

function requestFor(body: (typeof requestVector)[number]) {
  return new NextRequest("http://localhost:3000/api/ticket-orders", {
    method: "POST",
    headers: { origin: "http://localhost:3000", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const delay = (ms: number) => new Promise((resolveDelay) => setTimeout(resolveDelay, ms));

async function resetFixture() {
  surveyStartedAt = null;
  payosEndedAt = null;
  rpc.mockReset().mockImplementation(async (name: string) => {
    if (name === SURVEY_RPC) surveyStartedAt = performance.now();
    await delay(rpcDelayMs);
    if (name === "create_ticket_order_v5") return { data: [{
      order_id: orderId,
      quantity: 1,
      unit_price_vnd: 169000,
      merch_option: "none",
      merch_price_vnd: 0,
      ticket_subtotal_vnd: 169000,
      total_vnd: 169000,
      order_status: "pending_payment",
      reused: false,
      blocked_until: null,
      checkout_order_code: 112233,
      checkout_order_id: orderId,
      checkout_amount_vnd: 169000,
      checkout_currency: "VND",
      checkout_payment_status: "pending",
      checkout_expires_at: new Date(Date.now() + 3600000).toISOString(),
      checkout_payment_link_id: null,
      checkout_url: null,
      checkout_can_create: true,
      checkout_can_reconcile: false,
      checkout_prepare_error_code: null,
    }], error: null };
    if (name === SURVEY_RPC) return { data: true, error: null };
    return { data: null, error: null };
  });
  getUser.mockReset().mockResolvedValue({ data: { user: { id: userId } }, error: null });
  createPayOsPaymentLink.mockReset().mockImplementation(async () => {
    await delay(payosDelayMs);
    payosEndedAt = performance.now();
    return { paymentLinkId: "benchmark-link", checkoutUrl: "https://pay.example.test/checkout" };
  });
  lookupPayOsPaymentLink.mockReset().mockResolvedValue(null);
  createClient.mockReset().mockReturnValue({ rpc });
}

async function measureSample(body: (typeof requestVector)[number]): Promise<Measurement> {
  await resetFixture();
  const started = performance.now();
  const response = await POST(requestFor(body));
  const elapsedMs = performance.now() - started;
  const names = rpc.mock.calls.map(([name]) => String(name));
  const surveyRpcCount = names.filter((name) => name === SURVEY_RPC).length;
  return {
    elapsedMs,
    status: response.status,
    serialRpcCount: names.filter((name) => SERIAL_RPCS.has(name)).length,
    surveyRpcCount,
    totalRpcCount: names.length,
    surveyStartedBeforePayosEnd: surveyRpcCount === 0 || surveyStartedAt === null || payosEndedAt === null ? null : surveyStartedAt < payosEndedAt,
  };
}

function countBy(samples: Measurement[], pick: (sample: Measurement) => number | boolean | null) {
  return samples.reduce<Record<string, number>>((counts, sample) => {
    const key = String(pick(sample));
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function summarize(samples: Measurement[]) {
  const failures = samples.filter((sample) => sample.status < 200 || sample.status >= 300).length;
  const times = samples.map((sample) => sample.elapsedMs);
  return {
    failures,
    statusDistribution: countBy(samples, (sample) => sample.status),
    rpcCounts: countBy(samples, (sample) => sample.serialRpcCount),
    surveyRpcCounts: countBy(samples, (sample) => sample.surveyRpcCount),
    totalRpcCounts: countBy(samples, (sample) => sample.totalRpcCount),
    surveyStartedBeforePayosEnd: countBy(samples, (sample) => sample.surveyStartedBeforePayosEnd),
    p50Ms: percentile(times, 0.5),
    p95Ms: percentile(times, 0.95),
  };
}

async function runSamples() {
  const samples: Measurement[] = [];
  for (let index = 0; index < warmupCount; index += 1) await measureSample(requestVector[index % requestVector.length]);
  for (let index = 0; index < sampleCount; index += 1) samples.push(await measureSample(requestVector[index]));
  return samples;
}

beforeEach(() => {
  vi.stubEnv("SITE_URL", "http://localhost:3000");
  vi.stubEnv("PAYOS_CHECKOUT_ENABLED", "true");
  vi.stubEnv("PAYOS_CLIENT_ID", "benchmark-client");
  vi.stubEnv("PAYOS_API_KEY", "benchmark-key");
  vi.stubEnv("PAYOS_CHECKSUM_KEY", "benchmark-checksum");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_benchmark");
  vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_benchmark");
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("authenticated ticket checkout performance contract", () => {
  it("keeps the earlier checkout-performance baseline content unchanged (line endings normalized)", async () => {
    let raw: Buffer | undefined;
    for (const candidate of oldBaselineCandidates) {
      try { raw = await readFile(candidate); break; } catch { /* try the next location */ }
    }
    if (!raw) {
      throw new Error(`Earlier checkout-performance baseline not found at any of: ${oldBaselineCandidates.join(", ")}`);
    }
    const text = raw.toString("utf8");
    const normalized = text.replace(/\r\n/g, "\n");
    // Normalization may only remove the CR of CRLF pairs; every other byte must be preserved.
    expect(normalized).toBe(text.split("\r\n").join("\n"));
    expect(text.length - normalized.length).toBe((text.match(/\r\n/g) ?? []).length);
    const digest = createHash("sha256").update(normalized, "utf8").digest("hex");
    expect(digest).toBe(OLD_BASELINE_SHA256);
    // A single changed byte must change the digest.
    const tampered = normalized.slice(0, -1) + (normalized.endsWith("x") ? "y" : "x");
    expect(createHash("sha256").update(tampered, "utf8").digest("hex")).not.toBe(OLD_BASELINE_SHA256);
  });

  it("adds the survey save in parallel without another serial RPC", async () => {
    const mode = process.env.CHECKOUT_PERF_MODE;
    if (mode !== "baseline" && mode !== "candidate") return;
    const routeSourceHash = createHash("sha256").update(await readFile(routePath)).digest("hex");
    const samples = await runSamples();
    const summary = summarize(samples);
    const fixture = {
      fixtureVersion,
      fixtureReset: "reset auth, RPC call history/results, provider mocks and timing marks before every warm-up and measured request; unique vector key used once per mode",
      vectorDigest,
      environment: {
        node: process.version,
        platform: process.platform,
        architecture: process.arch,
        rpcDelayMs,
        payosDelayMs,
        warmupCount,
        sampleCount,
        scenario: "authenticated fresh payable checkout with survey; mocked PayOS create (fixed delay) and mocked RPC delay; RPCs counted by name",
      },
    };
    const evidence = {
      capturedAt: new Date().toISOString(),
      mode,
      fixture,
      sourceRevision: { routeSha256: routeSourceHash },
      sampleOrder: requestVector.map((item) => item.idempotencyKey),
      ...summary,
    };

    if (mode === "baseline") {
      let existing = false;
      try { await readFile(baselinePath); existing = true; } catch { /* file does not exist yet */ }
      expect(existing, "baseline artifact must be captured once and never overwritten").toBe(false);
      expect(summary.failures).toBe(0);
      expect(summary.rpcCounts).toEqual({ "2": sampleCount });
      expect(summary.surveyRpcCounts).toEqual({ "0": sampleCount });
      await writeFile(baselinePath, `${JSON.stringify(evidence, null, 2)}\n`, { flag: "wx" });
      return;
    }

    const selectedBaseline = process.env.CHECKOUT_PERF_BASELINE;
    if (!selectedBaseline || !allowedBaselines.includes(selectedBaseline)) {
      throw new Error("CHECKOUT_PERF_BASELINE must select the ticket-order-survey baseline artifact.");
    }
    const baseline = JSON.parse(await readFile(resolve(process.cwd(), selectedBaseline), "utf8")) as typeof evidence;
    expect(baseline.mode).toBe("baseline");
    expect(baseline.fixture).toEqual(fixture);
    expect(baseline.sampleOrder).toEqual(evidence.sampleOrder);
    expect(summary.failures).toBeLessThanOrEqual(baseline.failures);
    expect(summary.rpcCounts).toEqual({ "2": sampleCount });
    expect(summary.surveyRpcCounts).toEqual({ "1": sampleCount });
    expect(summary.surveyStartedBeforePayosEnd).toEqual({ true: sampleCount });
    const p50DeltaMs = summary.p50Ms - baseline.p50Ms;
    await writeFile(candidatePath, `${JSON.stringify({ ...evidence, baselineFile: selectedBaseline, baseline: { p50Ms: baseline.p50Ms, p95Ms: baseline.p95Ms, failures: baseline.failures, statusDistribution: baseline.statusDistribution, rpcCounts: baseline.rpcCounts, surveyRpcCounts: baseline.surveyRpcCounts }, p50DeltaMs: Number(p50DeltaMs.toFixed(3)) }, null, 2)}\n`, "utf8");
    expect(p50DeltaMs).toBeLessThanOrEqual(10);
  });
});
