"use client";

import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { checkinForms } from "@/app/(routes)/_data/formPopup";

export const FORM_POPUP_DIALOG_ID = "form-popup-dialog";

type FormPopupProps = {
  /** Id of the check-in form to show; `null` or an unknown id keeps the popup closed. */
  activeId: string | null;
  onClose: () => void;
  /** Element that receives focus after the popup closes. */
  returnFocus: RefObject<HTMLElement | null>;
};

type FrameState = { shownId: string | null; armed: readonly string[] };

export function FormPopup({ activeId, onClose, returnFocus }: FormPopupProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const active = checkinForms.find((form) => form.id === activeId);
  const open = active !== undefined;
  // Each form's iframe is created on its first open and then kept, so typed answers survive
  // a close or a switch to another form. The last shown form stays titled while closed.
  const [frames, setFrames] = useState<FrameState>({ shownId: null, armed: [] });
  if (active && (frames.shownId !== active.id || !frames.armed.includes(active.id))) {
    setFrames({
      shownId: active.id,
      armed: frames.armed.includes(active.id) ? frames.armed : [...frames.armed, active.id],
    });
  }
  const shown = checkinForms.find((form) => form.id === frames.shownId);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = [document.body, document.documentElement].map(({ style }) => ({
      style,
      value: style.getPropertyValue("overflow"),
      priority: style.getPropertyPriority("overflow"),
    }));
    previousOverflow.forEach(({ style }) => style.setProperty("overflow", "hidden", "important"));
    return () => {
      previousOverflow.forEach(({ style, value, priority }) => {
        if (value) style.setProperty("overflow", value, priority);
        else style.removeProperty("overflow");
      });
    };
  }, [open]);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) {
      element.showModal();
      element.querySelector<HTMLButtonElement>(".form-popup__close")?.focus();
    } else if (!open && element.open) {
      element.close();
      returnFocus.current?.focus();
    }
  }, [open, returnFocus]);

  return (
    <dialog
      id={FORM_POPUP_DIALOG_ID}
      ref={dialog}
      className="form-popup"
      aria-labelledby={titleId}
      aria-modal="true"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === dialog.current) onClose(); }}
    >
      <div className="form-popup__layout">
        <header className="form-popup__bar">
          <h2 id={titleId} className="form-popup__title">{shown?.dialogTitle}</h2>
          <button type="button" className="form-popup__close" aria-label="Đóng biểu mẫu" onClick={onClose}>
            <span aria-hidden="true">×</span>
          </button>
        </header>
        <div className="form-popup__body">
          {checkinForms.filter((form) => frames.armed.includes(form.id)).map((form) => (
            <iframe
              key={form.id}
              className="form-popup__frame"
              src={form.embedUrl}
              title={form.dialogTitle}
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              hidden={form.id !== frames.shownId}
            />
          ))}
        </div>
        {shown && (
          <p className="form-popup__fallback">
            Không thấy biểu mẫu?{" "}
            <a href={shown.fallbackUrl} target="_blank" rel="noopener noreferrer">Mở trong tab mới ↗</a>
          </p>
        )}
      </div>
    </dialog>
  );
}
