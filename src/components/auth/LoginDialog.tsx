"use client";

import { useEffect, useRef } from "react";
import { GoogleLoginForm } from "./GoogleLoginForm";

export function LoginDialog({ open, error, onClose }: { open: boolean; error?: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) {
      trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      element.showModal();
      element.querySelector<HTMLButtonElement>(".login-dialog__google")?.focus();
    } else if (!open && element.open) {
      element.close();
      trigger.current?.focus();
    }
  }, [open]);
  return <dialog ref={dialog} className="login-dialog" aria-labelledby="login-dialog-title" aria-describedby="login-dialog-description" onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === dialog.current) onClose(); }}>
    <button className="login-dialog__close" type="button" aria-label="Đóng cửa sổ đăng nhập" onClick={onClose}>×</button>
    <p className="login-dialog__brand">REPLY 199X</p>
    <h2 id="login-dialog-title">Đăng nhập REPLY 199X</h2>
    <p id="login-dialog-description">Đăng nhập bằng Google để tiếp tục.</p>
    {error && <p className="login-dialog__error" role="alert">{error}</p>}
    <GoogleLoginForm />
  </dialog>;
}
