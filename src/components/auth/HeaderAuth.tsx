"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { AuthView } from "@/lib/supabase/session";
import { GoogleLoginForm } from "./GoogleLoginForm";
import { LoginDialog } from "./LoginDialog";

const AUTH_ERRORS: Record<string, string> = {
  callback: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.",
  unavailable: "Chưa thể kết nối Google. Vui lòng thử lại sau.",
  signout: "Đã xóa phiên trên trình duyệt nhưng chưa xác nhận thu hồi phiên. Vui lòng thử đăng nhập lại khi kết nối ổn định.",
};

export function HeaderAuth({ auth }: { auth: AuthView }) {
  const [open, setOpen] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);
  const [logoutError, setLogoutError] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const errorCode = search.get("auth_error");
  useEffect(() => {
    if (errorCode && AUTH_ERRORS[errorCode]) {
      setOpen(true);
      const params = new URLSearchParams(search.toString());
      params.delete("auth_error");
      const query = params.toString();
      window.history.replaceState(null, "", `${pathname}${query ? `?${query}` : ""}${window.location.hash}`);
    }
  }, [errorCode, pathname, search]);
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") router.refresh(); };
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [router]);

  if (auth.status === "authenticated") return <div className="event-header__account">
    <span className="event-header__name" title={auth.displayName}>{auth.displayName}</span>
    <form action="/api/auth/logout" method="post" onSubmit={() => setLogoutPending(true)}>
      <button className="event-header__cta" type="submit" disabled={logoutPending}>{logoutPending ? "Đang đăng xuất…" : "Đăng xuất"}</button>
    </form>
    {logoutError && <span role="alert">Chưa thể đăng xuất. Hãy thử lại.</span>}
  </div>;

  return <>
    <button className="event-header__cta" type="button" aria-haspopup="dialog" aria-controls="header-login-dialog" onClick={() => setOpen(true)}>{auth.status === "unavailable" ? "Thử lại đăng nhập" : "Đăng nhập"}</button>
    {auth.status === "unavailable" && <span className="sr-only" role="status">Chưa xác minh được phiên đăng nhập</span>}
    <LoginDialog open={open} error={errorCode && AUTH_ERRORS[errorCode] ? AUTH_ERRORS[errorCode] : undefined} onClose={() => setOpen(false)} />
  </>;
}
