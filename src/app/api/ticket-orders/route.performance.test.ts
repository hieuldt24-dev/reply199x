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

const baselinePath = resolve(process.cwd(), "process/general-plans/active/ticket-checkout-performance_17-11-26/ticket-checkout-performance_BASELINE_17-11-26.json");
const candidatePath = resolve(process.cwd(), "process/general-plans/active/ticket-checkout-performance_17-11-26/ticket-checkout-performance_CANDIDATE_17-11-26.json");
const routePath = resolve(process.cwd(), "src/app/api/ticket-orders/route.ts");
const userId = "7d444840-9dc0-4e22-a132-5a1ae8a4f1d0";
const rpcDelayMs = 15;
const warmupCount = 5;
const sampleCount = 50;
const fixtureVersion = "fresh-payable-checkout-v1";
const requestVector = Array.from({ length: sampleCount }, (_, index) => ({
  idempotencyKey: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
  name: "Nguyen An",
  email: "an@example.com",
  phone: "",
  gender: "",
  birthYear: null,
  quantity: 1,
  merch: "none",
}));
const vectorDigest = createHash("sha256").update(JSON.stringify(requestVector)).digest("hex");

type Measurement = {
  elapsedMs: number;
  status: number;
  rpcCount: number;
};

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

async function resetFixture() {
  rpc.mockReset().mockImplementation(async (name: string, args?: Record<string, unknown>) => {
    await new Promise((resolveDelay) => setTimeout(resolveDelay, rpcDelayMs));
    if (name === "create_ticket_order_v4") return { data: [{
      order_id: "a3d9df10-fc46-4f23-8d73-96fe71ad9465",
      quantity: 1,
      unit_price_vnd: 169000,
      merch_option: "none",
      merch_price_vnd: 0,
      ticket_subtotal_vnd: 169000,
      total_vnd: 169000,
      order_status: "pending_payment",
      reused: false,
      blocked_until: null,
    }], error: null };
    if (name === "create_ticket_order_v5") return { data: [{
      order_id: "a3d9df10-fc46-4f23-8d73-96fe71ad9465",
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
      checkout_order_id: "a3d9df10-fc46-4f23-8d73-96fe71ad9465",
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
    if (name === "prepare_payos_checkout") {
      if (args?.p_payment_link_id === null) return { data: [{
          order_code: 112233,
          amount_vnd: 169000,
          currency: "VND",
          payment_status: "pending",
          expires_at: new Date(Date.now() + 3600000).toISOString(),
          payment_link_id: null,
          checkout_url: null,
          can_create: true,
          can_reconcile: false,
      }], error: null };
      return { data: null, error: null };
    }
    return { data: null, error: null };
  });
  getUser.mockReset().mockResolvedValue({ data: { user: { id: userId } }, error: null });
  createPayOsPaymentLink.mockReset().mockResolvedValue({ paymentLinkId: "benchmark-link", checkoutUrl: "https://pay.example.test/checkout" });
  lookupPayOsPaymentLink.mockReset().mockResolvedValue(null);
  createClient.mockReset().mockReturnValue({ rpc });
}

async function measureSample(body: (typeof requestVector)[number]): Promise<Measurement> {
  await resetFixture();
  const started = performance.now();
  const response = await POST(requestFor(body));
  const result = { elapsedMs: performance.now() - started, status: response.status, rpcCount: rpc.mock.calls.length };
  return result;
}

function summarize(samples: Measurement[]) {
  const failures = samples.filter((sample) => sample.status < 200 || sample.status >= 300).length;
  const statusDistribution = samples.reduce<Record<string, number>>((counts, sample) => {
    counts[String(sample.status)] = (counts[String(sample.status)] ?? 0) + 1;
    return counts;
  }, {});
  const rpcCounts = samples.reduce<Record<string, number>>((counts, sample) => {
    counts[String(sample.rpcCount)] = (counts[String(sample.rpcCount)] ?? 0) + 1;
    return counts;
  }, {});
  const times = samples.map((sample) => sample.elapsedMs);
  return { failures, statusDistribution, rpcCounts, p50Ms: percentile(times, 0.5), p95Ms: percentile(times, 0.95) };
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
  it("reduces median handler time against the immutable baseline", async () => {
    const mode = process.env.CHECKOUT_PERF_MODE;
    if (mode !== "baseline" && mode !== "candidate") return;
    const routeSourceHash = createHash("sha256").update(await readFile(routePath)).digest("hex");
    const samples = await runSamples();
    const summary = summarize(samples);
    const fixture = {
      fixtureVersion,
      fixtureReset: "reset auth, RPC call history/results and provider mocks before every warm-up and measured request; unique vector key used once per mode",
      vectorDigest,
      environment: {
        node: process.version,
        platform: process.platform,
        architecture: process.arch,
        rpcDelayMs,
        warmupCount,
        sampleCount,
        scenario: "authenticated fresh payable checkout with mocked PayOS create and sequential mocked RPC delay",
      },
    };
    const evidence = {
      capturedAt: new Date().toISOString(),
      mode,
      fixture,
      sourceRevision: { routeSha256: routeSourceHash, gitHead: "unavailable: workspace has no Git repository" },
      sampleOrder: requestVector.map((item) => item.idempotencyKey),
      ...summary,
    };

    if (mode === "baseline") {
      let existing = false;
      try { await readFile(baselinePath); existing = true; } catch { /* file does not exist yet */ }
      expect(existing, "baseline artifact must be captured once and never overwritten").toBe(false);
      expect(summary.failures).toBe(0);
      expect(summary.rpcCounts).toEqual({ "3": sampleCount });
      await writeFile(baselinePath, `${JSON.stringify(evidence, null, 2)}\n`, { flag: "wx" });
      return;
    }

    const selectedBaseline = process.env.CHECKOUT_PERF_BASELINE;
    if (selectedBaseline !== "process/general-plans/active/ticket-checkout-performance_17-11-26/ticket-checkout-performance_BASELINE_17-11-26.json") {
      throw new Error("CHECKOUT_PERF_BASELINE must select the immutable ticket checkout baseline artifact.");
    }
    const baseline = JSON.parse(await readFile(resolve(process.cwd(), selectedBaseline), "utf8")) as typeof evidence;
    expect(baseline.mode).toBe("baseline");
    expect(baseline.fixture).toEqual(fixture);
    expect(baseline.sampleOrder).toEqual(evidence.sampleOrder);
    expect(summary.failures).toBeLessThanOrEqual(baseline.failures);
    expect(summary.rpcCounts).toEqual({ "2": sampleCount });
    const reductionMs = baseline.p50Ms - summary.p50Ms;
    const reductionPercent = baseline.p50Ms > 0 ? reductionMs / baseline.p50Ms : 0;
    expect(reductionMs).toBeGreaterThanOrEqual(10);
    expect(reductionPercent).toBeGreaterThanOrEqual(0.2);
    await writeFile(candidatePath, `${JSON.stringify({ ...evidence, baseline: { p50Ms: baseline.p50Ms, p95Ms: baseline.p95Ms, failures: baseline.failures, statusDistribution: baseline.statusDistribution, rpcCounts: baseline.rpcCounts }, reductionMs: Number(reductionMs.toFixed(3)), reductionPercent: Number((reductionPercent * 100).toFixed(2)) }, null, 2)}\n`, "utf8");
  });
});
