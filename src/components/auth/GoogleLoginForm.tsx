"use client";

import { useState } from "react";

export function GoogleLoginForm() {
  const [pending, setPending] = useState(false);
  return <form action="/api/auth/google" method="post" onSubmit={() => setPending(true)}>
    <button className="login-dialog__google" type="submit" disabled={pending}>
      <span aria-hidden="true">G</span>{pending ? "Đang chuyển đến Google…" : "Tiếp tục với Google"}
    </button>
    {pending && <p className="login-dialog__status" role="status" aria-live="polite">Đang kết nối với Google…</p>}
  </form>;
}
