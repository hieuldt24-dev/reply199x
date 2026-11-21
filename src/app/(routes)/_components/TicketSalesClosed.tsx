import { cn } from "@/lib/utils";

export function TicketSalesClosed({ className }: { className?: string }) {
  return (
    <span className={cn(className, "ticket-closed cursor-not-allowed select-none")} role="status">
      Đã đóng đặt phiếu nước
    </span>
  );
}
