"use client";

import { useRef, useState, type FormEvent } from "react";

const recipient = "loihoidap199x@gmail.com";
const fieldClass = "w-full bg-retro-paper-card border-2 border-retro-dark/30 rounded-lg px-3.5 py-2.5 text-base font-vietnam text-retro-dark focus:border-retro-forest shadow-sm";

type Letter = Readonly<{ name: string; email: string; message: string }>;

export function ContactForm() {
  const [preview, setPreview] = useState<Letter | null>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const previewHeading = useRef<HTMLHeadingElement>(null);

  function prepareLetter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const letter = {
      name: String(data.get("name") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      message: String(data.get("message") ?? "").trim(),
    };
    if (!letter.name || !letter.message) {
      const field = form.elements.namedItem(!letter.name ? "name" : "message");
      if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) {
        field.setCustomValidity("Vui lòng nhập nội dung, không chỉ khoảng trắng.");
        field.reportValidity();
      }
      return;
    }
    setPreview(letter);
    requestAnimationFrame(() => previewHeading.current?.focus());
  }

  const mailto = preview
    ? `mailto:${recipient}?subject=${encodeURIComponent(`Thư tâm tình 199X — ${preview.name}`)}&body=${encodeURIComponent(`Họ tên / Bút danh: ${preview.name}\nEmail liên hệ: ${preview.email}\n\n${preview.message}`)}`
    : `mailto:${recipient}`;

  return (
    <div className="lg:col-span-6 bg-retro-paper p-6 sm:p-8 rounded-2xl border-2 border-retro-forest shadow-retro-solid flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-3 pb-3">
          <h3 className="font-epilogue font-bold text-xl text-retro-dark uppercase">GỬI THƯ TÂM TÌNH 199X</h3>
          <span aria-hidden="true" className="retro-icon text-retro-red text-2xl">✎</span>
        </div>
        <p className="font-vietnam text-sm text-retro-ink-muted mb-3 leading-relaxed">
          Để lại một câu chuyện thời niên thiếu, gửi tặng một ca khúc xưa hay đăng ký nhận thông báo vé trực tiếp từ Ban tổ chức:
        </p>
        <p id="letter-note" className="font-vietnam text-sm text-retro-forest mb-5 leading-relaxed">
          Bạn có thể soạn và xem trước thư tại đây. Trang web không gửi hoặc lưu nội dung; để liên hệ Ban tổ chức, hãy mở email và tự gửi thư.
        </p>
        <form className="flex flex-col gap-4" aria-describedby="letter-note" onSubmit={prepareLetter} onInput={(event) => {
          const field = event.target;
          if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) field.setCustomValidity("");
          setPreview(null);
        }}>
          <div>
            <label htmlFor="letter-name" className="block font-space text-xs text-retro-dark font-bold uppercase mb-1">Họ tên / Bút danh của bạn:</label>
            <input ref={nameInput} id="letter-name" name="name" autoComplete="name" className={fieldClass} placeholder="Ví dụ: Người yêu băng cassette" required type="text" maxLength={160} />
          </div>
          <div>
            <label htmlFor="letter-email" className="block font-space text-xs text-retro-dark font-bold uppercase mb-1">Hòm thư điện tử (Email nhận thông báo vé):</label>
            <input id="letter-email" name="email" autoComplete="email" className={fieldClass} placeholder="email@cuaban.vn" required type="email" maxLength={254} />
          </div>
          <div>
            <label htmlFor="letter-message" className="block font-space text-xs text-retro-dark font-bold uppercase mb-1">Dòng tâm tình / Kỷ vật muốn gửi gắm:</label>
            <textarea id="letter-message" name="message" className={`${fieldClass} resize-y`} placeholder="Viết vài dòng về ký ức hoặc ca khúc bạn mong được lắng nghe..." required rows={4} maxLength={5000} />
          </div>
          <button className="inline-flex items-center justify-center gap-2 bg-retro-red hover:bg-[#b81700] text-retro-paper font-space text-xs font-bold uppercase tracking-wider px-6 py-3 rounded-lg border-2 border-retro-dark shadow-retro-solid transition-transform active:translate-y-0.5 mt-1 min-h-11" type="submit">
            <span aria-hidden="true" className="retro-icon text-sm text-retro-gold">✉</span>
            Xem trước thư ký ức
          </button>
        </form>
        <div role="status" aria-live="polite" className="mt-4 font-vietnam text-sm text-retro-forest">
          {preview ? "Thư đã sẵn sàng để xem trước. Nội dung chưa được gửi hoặc lưu." : ""}
        </div>
        {preview && (
          <div className="mt-4 p-4 bg-retro-paper-card border-2 border-dashed border-retro-forest rounded-lg break-words">
            <h4 ref={previewHeading} tabIndex={-1} className="font-space font-bold text-retro-dark mb-3">Bản xem trước thư ký ức</h4>
            <dl className="text-sm space-y-2">
              <div><dt className="font-bold">Người gửi</dt><dd>{preview.name}</dd></div>
              <div><dt className="font-bold">Email liên hệ</dt><dd>{preview.email}</dd></div>
              <div><dt className="font-bold">Dòng tâm tình</dt><dd className="whitespace-pre-wrap">{preview.message}</dd></div>
            </dl>
            <div className="flex flex-wrap gap-3 mt-4">
              <a href={mailto} className="button text-sm">Mở email để gửi thư</a>
              <button type="button" className="min-h-11 px-3 underline font-space text-sm text-retro-dark" onClick={() => { setPreview(null); nameInput.current?.focus(); }}>Chỉnh sửa thư</button>
            </div>
          </div>
        )}
        <p className="mt-4 text-sm text-retro-ink-muted break-words">Hoặc gửi email trực tiếp: <a className="underline text-retro-red" href={`mailto:${recipient}`}>{recipient}</a></p>
      </div>
    </div>
  );
}
