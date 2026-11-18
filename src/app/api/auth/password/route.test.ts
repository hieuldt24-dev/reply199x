import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { POST } from "./route";

const { createClient, createRouteClient, maybeSingle, getUserById, dummySignIn, routeSignIn } = vi.hoisted(() => ({
  createClient: vi.fn(),
  createRouteClient: vi.fn(),
  maybeSingle: vi.fn(),
  getUserById: vi.fn(),
  dummySignIn: vi.fn(),
  routeSignIn: vi.fn(),
}));
vi.mock("@supabase/supabase-js", () => ({ createClient }));
vi.mock("@/lib/supabase/route-client", () => ({ createRouteClient }));

const SITE = "https://reply199x.example";
const SUPABASE_URL = "https://project.supabase.co";
const PUBLISHABLE = "sb_publishable_test";
const SECRET = "sb_secret_test";
const USERNAME = "ten_dang_nhap";
const PASSWORD = "MatKhau-Bi-Mat-99";
const EMAIL = "member@example.test";
const USER_ID = "7d444840-9dc0-4e22-a132-5a1ae8a4f1d0";
const NIL_UUID = "00000000-0000-0000-0000-000000000000";
const GENERIC_401 = JSON.stringify({ error: { code: "invalid_credentials", message: "Tên đăng nhập hoặc mật khẩu không đúng." } });
const GENERIC_503 = JSON.stringify({ error: { code: "temporarily_unavailable", message: "Chưa thể đăng nhập. Vui lòng thử lại sau." } });
const SENSITIVE = [USERNAME, PASSWORD, EMAIL, USER_ID];

const from = vi.fn();
const select = vi.fn();
const eq = vi.fn();
let consoleSpies: ReturnType<typeof vi.spyOn>[] = [];

function request(body: unknown = { username: USERNAME, password: PASSWORD }, origin: string | null = SITE) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (origin !== null) headers.origin = origin;
  return new NextRequest(`${SITE}/api/auth/password`, {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function mapped() {
  maybeSingle.mockResolvedValue({ data: { user_id: USER_ID }, error: null });
  getUserById.mockResolvedValue({ data: { user: { id: USER_ID, email: EMAIL } }, error: null });
}

function authError(status: number | undefined, code?: string) {
  return Object.assign(new Error("auth error"), { status, code });
}

async function expectNoCookieAndNoStore(response: Response) {
  expect(response.headers.get("set-cookie")).toBeNull();
  expect(response.headers.get("cache-control")).toBe("private, no-store");
}

async function expectGeneric401(response: Response) {
  expect(response.status).toBe(401);
  expect(await response.text()).toBe(GENERIC_401);
  await expectNoCookieAndNoStore(response);
}

async function expect503(response: Response) {
  expect(response.status).toBe(503);
  expect(await response.text()).toBe(GENERIC_503);
  await expectNoCookieAndNoStore(response);
}

function dummyClientCalls() {
  return createClient.mock.calls.filter(([, key]) => key === PUBLISHABLE);
}

beforeEach(() => {
  vi.stubEnv("SITE_URL", SITE);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", PUBLISHABLE);
  vi.stubEnv("SUPABASE_SECRET_KEY", SECRET);
  eq.mockReturnValue({ maybeSingle });
  select.mockReturnValue({ eq });
  from.mockReturnValue({ select });
  createClient.mockImplementation((_url: string, key: string) => key === SECRET
    ? { from, auth: { admin: { getUserById } } }
    : { auth: { signInWithPassword: dummySignIn } });
  dummySignIn.mockResolvedValue({ data: { user: null, session: null }, error: authError(400, "invalid_credentials") });
  createRouteClient.mockImplementation((_request: NextRequest, response: NextResponse) => {
    response.headers.set("Cache-Control", "private, no-store");
    return {
      auth: {
        signInWithPassword: async (args: unknown) => {
          const result = await routeSignIn(args);
          if (!result.error) response.cookies.set("sb-project-auth-token", "session-value", { httpOnly: true, path: "/" });
          return result;
        },
      },
    };
  });
  routeSignIn.mockResolvedValue({ data: { session: {} }, error: null });
  consoleSpies = (["log", "info", "warn", "error", "debug"] as const).map((method) => vi.spyOn(console, method).mockImplementation(() => undefined));
});

afterEach(() => {
  for (const spy of consoleSpies) {
    for (const call of spy.mock.calls) {
      const text = JSON.stringify(call);
      for (const value of SENSITIVE) expect(text).not.toContain(value);
    }
  }
  vi.clearAllMocks();
});

describe("POST /api/auth/password", () => {
  it("should set the Supabase session cookies on the returned 200 response for a mapped user with the right password", async () => {
    mapped();
    const response = await POST(request({ username: "  Ten_Dang_Nhap ", password: PASSWORD }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(response.headers.get("set-cookie")).toContain("sb-project-auth-token=session-value");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(eq).toHaveBeenCalledWith("username", USERNAME);
    expect(getUserById).toHaveBeenCalledWith(USER_ID);
    expect(routeSignIn).toHaveBeenCalledWith({ email: EMAIL, password: PASSWORD });
    expect(dummySignIn).not.toHaveBeenCalled();
    const adminOptions = createClient.mock.calls.find(([, key]) => key === SECRET)?.[2];
    expect(adminOptions.auth).toMatchObject({ persistSession: false, autoRefreshToken: false });
  });

  it("should return a byte-identical 401 for an unknown username and for a wrong password, and perform exactly one getUserById and one dummy sign-in on the plain client for the unknown username", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    const unknown = await POST(request());
    const unknownBody = await unknown.text();
    expect(unknown.status).toBe(401);
    expect(getUserById).toHaveBeenCalledTimes(1);
    expect(getUserById).toHaveBeenCalledWith(NIL_UUID);
    expect(dummySignIn).toHaveBeenCalledTimes(1);
    expect(dummySignIn.mock.calls[0][0].password).toBe(PASSWORD);
    expect(dummySignIn.mock.calls[0][0].email).not.toBe(EMAIL);
    expect(createRouteClient).not.toHaveBeenCalled();
    expect(dummyClientCalls()).toHaveLength(1);
    expect(dummyClientCalls()[0][0]).toBe(SUPABASE_URL);
    expect(dummyClientCalls()[0][2].auth).toMatchObject({ persistSession: false, autoRefreshToken: false });
    expect(unknown.headers.get("set-cookie")).toBeNull();

    vi.clearAllMocks();
    mapped();
    routeSignIn.mockResolvedValue({ data: { session: null }, error: authError(400, "invalid_credentials") });
    const wrong = await POST(request());
    expect(wrong.status).toBe(401);
    expect(await wrong.text()).toBe(unknownBody);
    expect(unknownBody).toBe(GENERIC_401);
    await expectNoCookieAndNoStore(wrong);
  });

  it("should return 400 for invalid input, 403 for a bad Origin, 503 for a getSiteOrigin throw, a missing secret key or a lookup error, and never log username/password/email/user_id", async () => {
    for (const body of ["{not json", [], { username: USERNAME }, { username: USERNAME, password: "short" }, { username: USERNAME, password: "ệ".repeat(25) }, { username: "Bad-Name!", password: PASSWORD }, { username: 5, password: PASSWORD }]) {
      const response = await POST(request(body));
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: { code: "invalid_request" } });
      await expectNoCookieAndNoStore(response);
    }
    for (const origin of ["https://evil.example", null]) {
      const response = await POST(request(undefined, origin));
      expect(response.status).toBe(403);
      expect(await response.text()).toBe("");
      await expectNoCookieAndNoStore(response);
    }
    expect(createClient).not.toHaveBeenCalled();

    vi.stubEnv("SITE_URL", "ftp://bad.example");
    await expect503(await POST(request()));
    vi.stubEnv("SITE_URL", SITE);

    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    await expect503(await POST(request()));
    vi.stubEnv("SUPABASE_SECRET_KEY", "not-a-secret-key");
    await expect503(await POST(request()));
    vi.stubEnv("SUPABASE_SECRET_KEY", SECRET);

    maybeSingle.mockResolvedValue({ data: null, error: { message: "relation does not exist" } });
    await expect503(await POST(request()));
    maybeSingle.mockRejectedValue(new Error("network down"));
    await expect503(await POST(request()));
    expect(routeSignIn).not.toHaveBeenCalled();
  });

  it("should map each upstream outcome per the error table, send no set-cookie on any 400/401/403/503, and send Cache-Control private no-store on every response", async () => {
    // getUserById 404 -> unmapped path, no repeated getUserById
    maybeSingle.mockResolvedValue({ data: { user_id: USER_ID }, error: null });
    getUserById.mockResolvedValue({ data: { user: null }, error: authError(404, "user_not_found") });
    await expectGeneric401(await POST(request()));
    expect(getUserById).toHaveBeenCalledTimes(1);
    expect(getUserById).toHaveBeenCalledWith(USER_ID);
    expect(dummySignIn).toHaveBeenCalledTimes(1);
    expect(createRouteClient).not.toHaveBeenCalled();

    // user_not_found code without a 404 status
    vi.clearAllMocks();
    getUserById.mockResolvedValue({ data: { user: null }, error: authError(400, "user_not_found") });
    await expectGeneric401(await POST(request()));
    expect(getUserById).toHaveBeenCalledTimes(1);
    expect(dummySignIn).toHaveBeenCalledTimes(1);

    // user without email -> unmapped path
    vi.clearAllMocks();
    getUserById.mockResolvedValue({ data: { user: { id: USER_ID, email: undefined } }, error: null });
    await expectGeneric401(await POST(request()));
    expect(getUserById).toHaveBeenCalledTimes(1);
    expect(dummySignIn).toHaveBeenCalledTimes(1);
    expect(createRouteClient).not.toHaveBeenCalled();

    // other getUserById error or thrown -> 503
    vi.clearAllMocks();
    getUserById.mockResolvedValue({ data: { user: null }, error: authError(500, "unexpected_failure") });
    await expect503(await POST(request()));
    getUserById.mockRejectedValue(new Error("boom"));
    await expect503(await POST(request()));
    expect(dummySignIn).not.toHaveBeenCalled();

    // dummy sign-in errors are discarded on the unmapped path
    vi.clearAllMocks();
    maybeSingle.mockResolvedValue({ data: null, error: null });
    dummySignIn.mockRejectedValue(new Error("network down"));
    await expectGeneric401(await POST(request()));

    // signInWithPassword outcomes
    const cases: [Error, number][] = [
      [authError(400, "invalid_credentials"), 401],
      [authError(400, "email_not_confirmed"), 401],
      [authError(429, "over_request_rate_limit"), 503],
      [authError(400, "over_request_rate_limit"), 503],
      [authError(500, "unexpected_failure"), 503],
      [authError(503), 503],
      [authError(0, undefined), 503],
      [authError(undefined, undefined), 503],
    ];
    for (const [error, status] of cases) {
      vi.clearAllMocks();
      mapped();
      routeSignIn.mockResolvedValue({ data: { session: null }, error });
      const response = await POST(request());
      if (status === 401) await expectGeneric401(response);
      else await expect503(response);
    }
    vi.clearAllMocks();
    mapped();
    routeSignIn.mockRejectedValue(new TypeError("fetch failed"));
    await expect503(await POST(request()));
  });
});
