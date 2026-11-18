"use client";

import { useState, type FormEvent } from "react";
import { parseCredentials } from "@/lib/auth/username";

const MESSAGES = {
  empty: "Vui lòng nhập tên đăng nhập và mật khẩu.",
  invalid: "Tên đăng nhập gồm 3–32 ký tự a-z, 0-9, dấu _ hoặc dấu chấm; mật khẩu từ 8 đến 72 byte.",
  credentials: "Tên đăng nhập hoặc mật khẩu không đúng.",
  unavailable: "Chưa thể đăng nhập. Vui lòng thử lại sau.",
} as const;

export function CredentialLoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (!username.trim() || !password) {
      setError(MESSAGES.empty);
      return;
    }
    const credentials = parseCredentials({ username, password });
    if (!credentials) {
      setError(MESSAGES.invalid);
      return;
    }
    setError(null);
    setPending(true);
    try {
      const response = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(credentials),
      });
      if (response.ok) {
        // Full navigation (not router.push) so server components and the header re-read the
        // new session cookie, the same effect as the Google login redirect.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign("/");
        return;
      }
      if (response.status === 401) {
        setPassword("");
        setError(MESSAGES.credentials);
      } else {
        setError(MESSAGES.unavailable);
      }
    } catch {
      setError(MESSAGES.unavailable);
    }
    setPending(false);
  }

  return <form className="login-dialog__credentials" noValidate onSubmit={onSubmit}>
    <label htmlFor="login-username">Tên đăng nhập</label>
    <input type="text" id="login-username" name="username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} disabled={pending} />
    <label htmlFor="login-password">Mật khẩu</label>
    <input type="password" id="login-password" name="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={pending} />
    <button className="login-dialog__submit" type="submit" disabled={pending}>{pending ? "Đang đăng nhập…" : "Đăng nhập"}</button>
    {error && <p className="login-dialog__error" role="alert">{error}</p>}
  </form>;
}
