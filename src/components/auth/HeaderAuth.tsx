"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { AuthView } from "@/lib/supabase/session";
import { LoginDialog } from "./LoginDialog";

const AUTH_ERRORS: Record<string, string> = {
  callback: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.",
  unavailable: "Chưa thể kết nối Google. Vui lòng thử lại sau.",
  signout: "Đã xóa phiên trên trình duyệt nhưng chưa xác nhận thu hồi phiên. Vui lòng thử đăng nhập lại khi kết nối ổn định.",
};

export function HeaderAuth({ auth }: { auth: AuthView }) {
  const [open, setOpen] = useState(auth.status === "anonymous");
  const [logoutPending, setLogoutPending] = useState(false);
  const [refreshPending, startRefresh] = useTransition();
  const lastRefresh = useRef<number | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const errorCode = search.get("auth_error");
  const [errorMessage] = useState(errorCode ? AUTH_ERRORS[errorCode] : undefined);
  useEffect(() => {
    if (errorCode && AUTH_ERRORS[errorCode]) {
      const params = new URLSearchParams(search.toString());
      params.delete("auth_error");
      const query = params.toString();
      window.history.replaceState(null, "", `${pathname}${query ? `?${query}` : ""}${window.location.hash}`);
    }
  }, [errorCode, pathname, search]);
  useEffect(() => {
    const refresh = () => {
      const now = Date.now();
      if (document.visibilityState !== "visible" || refreshPending
        || (lastRefresh.current !== null && now - lastRefresh.current < 5_000)) return;
      lastRefresh.current = now;
      startRefresh(() => router.refresh());
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router, refreshPending]);

  if (auth.status === "authenticated") return <div className="event-header__account">
    <span className="event-header__name" title={auth.displayName}>{auth.displayName}</span>
    <form action="/api/auth/logout" method="post" onSubmit={() => setLogoutPending(true)}>
      <button className="event-header__cta" type="submit" disabled={logoutPending}>{logoutPending ? "Đang đăng xuất…" : "Đăng xuất"}</button>
    </form>
  </div>;

  if (auth.status === "unavailable") return <div className="event-header__account">
    <span role="status">Chưa xác minh được phiên đăng nhập. Vui lòng thử lại.</span>
    <button className="event-header__cta" type="button" disabled={refreshPending}
      onClick={() => startRefresh(() => router.refresh())}>
      {refreshPending ? "Đang kiểm tra…" : "Kiểm tra lại phiên đăng nhập"}
    </button>
  </div>;

  return <>
    <button className="event-header__cta" type="button" aria-haspopup="dialog" aria-controls="header-login-dialog" onClick={() => setOpen(true)}>Đăng nhập</button>
    <LoginDialog open={open} error={errorMessage} onClose={() => setOpen(false)} />
  </>;
}
