import { cn } from "@/lib/utils";

export function TicketSalesClosed({ className }: { className?: string }) {
  return (
    <span className={cn(className, "cursor-not-allowed select-none opacity-60")} role="status">
      Đã đóng đặt phiếu nước
    </span>
  );
}
