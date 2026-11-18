"use client";

import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { FORM_POPUP_TITLE, formPopupLinks } from "@/app/(routes)/_data/formPopup";

export const FORM_POPUP_DIALOG_ID = "form-popup-dialog";

type FormPopupProps = {
  open: boolean;
  onClose: () => void;
  /** Element that receives focus after the popup closes. */
  returnFocus: RefObject<HTMLElement | null>;
};

export function FormPopup({ open, onClose, returnFocus }: FormPopupProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  // The iframe is created on first open and then kept, so typed answers survive a close.
  const [armed, setArmed] = useState(false);
  if (open && !armed) setArmed(true);

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
          <h2 id={titleId} className="form-popup__title">{FORM_POPUP_TITLE}</h2>
          <button type="button" className="form-popup__close" aria-label="Đóng biểu mẫu" onClick={onClose}>
            <span aria-hidden="true">×</span>
          </button>
        </header>
        <div className="form-popup__body">
          {armed && (
            <iframe
              className="form-popup__frame"
              src={formPopupLinks.embed}
              title={FORM_POPUP_TITLE}
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          )}
        </div>
        <p className="form-popup__fallback">
          Không thấy biểu mẫu?{" "}
          <a href={formPopupLinks.fallback} target="_blank" rel="noopener noreferrer">Mở trong tab mới ↗</a>
        </p>
      </div>
    </dialog>
  );
}
