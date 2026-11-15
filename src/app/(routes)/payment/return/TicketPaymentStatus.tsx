"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type ViewState =
  | Readonly<{ kind: "loading" }>
  | Readonly<{ kind: "unauthorized" }>
  | Readonly<{ kind: "error" }>
  | Readonly<{ kind: "ready"; status: string; totalVnd: number; paymentExpiresAt: string }>;

const terminalStatuses = new Set(["paid", "expired", "failed", "reconciliation", "refunded"]);
const paidRedirectDelayMs = 3000;
const statusMessages: Record<string, string> = {
  pending_payment: "Đơn đang chờ PayOS xác nhận thanh toán.",
  paid: "Đã nhận thanh toán. Ban tổ chức sẽ gửi thông tin vé theo hướng dẫn sự kiện.",
  expired: "Thời hạn thanh toán của đơn đã hết.",
  failed: "Giao dịch không hoàn tất. Liên hệ ban tổ chức nếu bạn đã bị trừ tiền.",
  reconciliation: "Giao dịch cần được ban tổ chức đối soát. Vui lòng chưa thanh toán lại.",
  refunded: "Đơn đã được hoàn tiền.",
};

export function TicketPaymentStatus({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [view, setView] = useState<ViewState>({ kind: "loading" });

  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let redirectTimer: ReturnType<typeof setTimeout> | undefined;
    let activeRequest: AbortController | undefined;
    let terminal = false;
    let visible = document.visibilityState !== "hidden";

    const schedule = (delay: number) => {
      if (!disposed && !terminal && visible) timer = setTimeout(() => { timer = undefined; void refresh(); }, delay);
    };

    const refresh = async () => {
      if (disposed || terminal || !visible || activeRequest) return;
      const controller = new AbortController();
      activeRequest = controller;
      const isCurrent = () => !disposed && !controller.signal.aborted && activeRequest === controller;
      try {
        const response = await fetch(`/api/ticket-orders/${encodeURIComponent(orderId)}`, {
          cache: "no-store",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        if (!isCurrent()) return;
        if (response.status === 401) {
          terminal = true;
          setView({ kind: "unauthorized" });
          return;
        }
        if (!response.ok) throw new Error("Status request unavailable");
        const data = await response.json() as { order?: { status?: string; totalVnd?: number; paymentExpiresAt?: string } };
        if (!isCurrent()) return;
        const order = data?.order;
        if (!order || typeof order.status !== "string" || !Number.isSafeInteger(order.totalVnd) || typeof order.paymentExpiresAt !== "string") {
          throw new Error("Invalid status response");
        }
        terminal = terminalStatuses.has(order.status);
        setView({ kind: "ready", status: order.status, totalVnd: order.totalVnd as number, paymentExpiresAt: order.paymentExpiresAt });
        if (order.status === "paid") {
          redirectTimer = setTimeout(() => router.push("/#su-kien"), paidRedirectDelayMs);
        } else if (!terminal) {
          schedule(3000);
        }
      } catch {
        if (!isCurrent()) return;
        setView({ kind: "error" });
        schedule(5000);
      } finally {
        if (activeRequest === controller) activeRequest = undefined;
      }
    };

    const onVisibilityChange = () => {
      const nextVisible = document.visibilityState !== "hidden";
      if (nextVisible === visible) return;
      visible = nextVisible;
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
      if (!visible) {
        activeRequest?.abort();
        activeRequest = undefined;
      } else {
        void refresh();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    void refresh();
    return () => {
      disposed = true;
      activeRequest?.abort();
      if (timer !== undefined) clearTimeout(timer);
      if (redirectTimer !== undefined) clearTimeout(redirectTimer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [orderId, router]);

  if (view.kind === "loading") return <p className="mt-6 rounded-lg bg-white/70 p-4 text-sm" role="status">Đang tải trạng thái đơn hàng…</p>;
  if (view.kind === "unauthorized") return <p className="mt-6 rounded-lg bg-white/70 p-4 text-sm">Vui lòng <a className="underline" href="/auth/sign-in">đăng nhập Google</a> bằng tài khoản đã đặt đơn để xem trạng thái.</p>;
  if (view.kind === "error") return <p className="mt-6 rounded-lg bg-white/70 p-4 text-sm" role="status">Chưa tải được trạng thái. Trang sẽ tự thử lại; bạn cũng có thể tải lại sau ít phút.</p>;

  return (
    <div className="mt-6 rounded-lg bg-white/70 p-5" role="status" aria-live="polite">
      <p className="font-semibold">{statusMessages[view.status] ?? "Đơn đang được kiểm tra."}</p>
      <p className="mt-2 text-sm">Tổng đơn: {view.totalVnd.toLocaleString("vi-VN")}đ</p>
      <p className="mt-1 text-xs text-retro-dark/65">Hạn thanh toán: {new Date(view.paymentExpiresAt).toLocaleString("vi-VN")}</p>
      {!terminalStatuses.has(view.status) && <p className="mt-3 text-xs text-retro-dark/65">Đang tự kiểm tra trạng thái mỗi vài giây.</p>}
      {view.status === "paid" && <p className="mt-4 text-xs">Trang sự kiện sẽ mở sau 3 giây.</p>}
    </div>
  );
}
