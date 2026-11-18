import { describe, expect, it } from "vitest";
import { parseCredentials, USERNAME_RE } from "./username";

describe("parseCredentials", () => {
  it("trims and lowercases the username and keeps the password", () => {
    expect(parseCredentials({ username: "  Ten_Dang.Nhap1 ", password: "matkhau123" })).toEqual({ username: "ten_dang.nhap1", password: "matkhau123" });
  });
  it("rejects non-object bodies and non-string fields", () => {
    for (const body of [null, undefined, "x", 1, [], { username: 1, password: "matkhau123" }, { username: "abc", password: 12345678 }]) {
      expect(parseCredentials(body)).toBeNull();
    }
  });
  it("rejects usernames outside the allowed format", () => {
    for (const username of ["ab", "a".repeat(33), "tên", "ab-c", "a b", ""]) {
      expect(parseCredentials({ username, password: "matkhau123" })).toBeNull();
    }
    expect(USERNAME_RE.test("abc")).toBe(true);
    expect(USERNAME_RE.test("a".repeat(32))).toBe(true);
  });
  it("enforces 8 to 72 password bytes", () => {
    expect(parseCredentials({ username: "abc", password: "1234567" })).toBeNull();
    expect(parseCredentials({ username: "abc", password: "12345678" })).not.toBeNull();
    expect(parseCredentials({ username: "abc", password: "x".repeat(72) })).not.toBeNull();
    expect(parseCredentials({ username: "abc", password: "x".repeat(73) })).toBeNull();
  });
  it("measures multi-byte passwords in UTF-8 bytes", () => {
    expect(parseCredentials({ username: "abc", password: "ệ".repeat(24) })).not.toBeNull();
    expect(parseCredentials({ username: "abc", password: "ệ".repeat(25) })).toBeNull();
  });
});
