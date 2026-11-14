import { TicketPaymentStatus } from "./TicketPaymentStatus";
import Link from "next/link";

export default async function PaymentReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const { orderId } = await searchParams;
  return (
    <main className="reply-site min-h-[60vh] px-5 py-16">
      <section className="mx-auto max-w-2xl rounded-2xl border border-retro-gold/30 bg-retro-cream p-6 text-retro-dark shadow-xl sm:p-10">
        <span className="font-space text-xs font-bold uppercase tracking-[0.2em] text-retro-red">REPLY 199X · THANH TOÁN</span>
        <h1 className="mt-3 font-serif text-3xl font-bold">Kiểm tra trạng thái đơn</h1>
        <p className="mt-3 text-sm leading-6 text-retro-dark/75">
          Trang quay lại từ PayOS không tự xác nhận thanh toán. Trạng thái bên dưới được đọc từ đơn hàng đã lưu.
        </p>
        {orderId ? <TicketPaymentStatus orderId={orderId} /> : (
          <p className="mt-6 rounded-lg bg-white/70 p-4 text-sm" role="status">Không tìm thấy mã đơn hàng trong đường dẫn.</p>
        )}
        <div className="mt-6 border-t border-retro-gold/30 pt-4">
          <Link className="inline-flex underline" href="/#su-kien">Về trang chủ</Link>
        </div>
      </section>
    </main>
  );
}
