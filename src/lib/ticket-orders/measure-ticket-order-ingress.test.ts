import { afterEach, describe, expect, it, vi } from "vitest";

type ProbeModule = {
  parseLoopbackTarget: (value: string) => URL;
  parseArgs: (argv: string[]) => { baseUrl: URL; rate: number; durationSeconds: number };
  runProbe: (options: { baseUrl: string | URL; rate: number; durationSeconds: number }, dependencies?: Record<string, unknown>) => Promise<Record<string, unknown>>;
};
const probePath = "../../../scripts/measure-ticket-order-ingress.mjs";
function probeModule() { return import(/* @vite-ignore */ probePath) as Promise<ProbeModule>; }
afterEach(() => { vi.unstubAllGlobals(); });

describe("ticket-order ingress probe boundaries", () => {
  it("imports without issuing a network request", async () => {
    vi.resetModules();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const loaded = await probeModule();
    expect(typeof loaded.runProbe).toBe("function");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(["http://127.0.0.1:3001", "http://localhost:3001", "http://[::1]:3001"])("accepts exact loopback host %s", async (value) => {
    const { parseLoopbackTarget } = await probeModule();
    expect(parseLoopbackTarget(value).origin).toBe(value);
  });

  it.each([
    "https://127.0.0.1:3001",
    "http://user:secret@127.0.0.1:3001",
    "http://localhost.evil:3001",
    "http://127.0.0.1.evil:3001",
    "http://2130706433:3001",
    "http://0x7f000001:3001",
    "http://192.168.1.4:3001",
    "http://127.0.0.1:3001/path",
  ])("rejects unsafe target %s", async (value) => {
    const { parseLoopbackTarget } = await probeModule();
    expect(() => parseLoopbackTarget(value)).toThrow();
  });

  it("enforces exact CLI bounds and rejects unknown overrides", async () => {
    const { parseArgs } = await probeModule();
    expect(parseArgs(["--base-url", "http://127.0.0.1:3001", "--rate", "50", "--duration", "30"]).rate).toBe(50);
    for (const args of [
      ["--base-url", "http://127.0.0.1:3001", "--rate", "0", "--duration", "1"],
      ["--base-url", "http://127.0.0.1:3001", "--rate", "51", "--duration", "1"],
      ["--base-url", "http://127.0.0.1:3001", "--rate", "1", "--duration", "31"],
      ["--base-url", "http://127.0.0.1:3001", "--rate", "1", "--duration", "1", "--remote", "true"],
    ]) expect(() => parseArgs(args)).toThrow();
  });

  it("uses manual redirects, does not contact Location, and omits Origin/auth/payment headers", async () => {
    const { runProbe } = await probeModule();
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 405 }))
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { Location: "https://outside.invalid/should-not-run" } }));
    const summary = await runProbe({ baseUrl: "http://127.0.0.1:3001", rate: 1, durationSeconds: 1 }, { fetchImpl: fetchMock });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[1]?.redirect).toBe("manual");
    expect(fetchMock.mock.calls[1]?.[0]).toBeInstanceOf(URL);
    expect(String(fetchMock.mock.calls[1]?.[0])).toBe("http://127.0.0.1:3001/api/ticket-orders");
    expect(fetchMock.mock.calls[1]?.[1]?.headers).toEqual({ "content-type": "application/json" });
    expect(summary).toMatchObject({ label: "unauthenticated_ingress_only", readiness: { status: 405, ready: true }, sent: 1, completed: 1, statusDistribution: { "302": 1 }, redirectCount: 1, failures: 1 });
  });

  it("counts scheduled work skipped at the in-flight safety cap", async () => {
    const { runProbe } = await probeModule();
    const fetchMock = vi.fn<typeof fetch>((_input, init) => {
      if (init?.method === "GET") return Promise.resolve(new Response(null, { status: 405 }));
      return new Promise((resolveResponse, reject) => {
        const timer = setTimeout(() => resolveResponse(new Response(null, { status: 403 })), 100);
        init?.signal?.addEventListener("abort", () => { clearTimeout(timer); reject(new DOMException("aborted", "AbortError")); }, { once: true });
      });
    });
    const summary = await runProbe({ baseUrl: "http://127.0.0.1:3001", rate: 50, durationSeconds: 1 }, { fetchImpl: fetchMock, maxInFlight: 2 });
    const result = summary as { sent: number; skipped: number; failures: number };
    expect(result.skipped).toBeGreaterThan(0);
    expect(result.sent + result.skipped).toBe(50);
    expect(result.failures).toBe(result.skipped);
    expect(summary).toMatchObject({ transportErrors: 0, timeouts: 0 });
  });

  it("times out, aborts and awaits an outstanding request", async () => {
    const { runProbe } = await probeModule();
    const fetchMock = vi.fn<typeof fetch>((_input, init) => {
      if (init?.method === "GET") return Promise.resolve(new Response(null, { status: 405 }));
      return new Promise((_resolveResponse, reject) => init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true }));
    });
    const summary = await runProbe({ baseUrl: "http://127.0.0.1:3001", rate: 1, durationSeconds: 1 }, { fetchImpl: fetchMock, requestTimeoutMs: 10 });
    expect(summary).toMatchObject({ sent: 1, completed: 1, skipped: 0, timeouts: 1, transportErrors: 0, failures: 1 });
  });

  it("reports a 403 from the origin guard as the expected ingress-only outcome", async () => {
    const { runProbe } = await probeModule();
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 405 }))
      .mockResolvedValue(new Response(null, { status: 403 }));
    const summary = await runProbe({ baseUrl: "http://127.0.0.1:3001", rate: 2, durationSeconds: 1 }, { fetchImpl: fetchMock });
    expect(summary).toMatchObject({ label: "unauthenticated_ingress_only", sent: 2, completed: 2, statusDistribution: { "403": 2 }, failures: 0, skipped: 0, transportErrors: 0 });
  });
});
