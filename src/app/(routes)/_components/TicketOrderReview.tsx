import {
  SURVEY_AREA_LABELS,
  SURVEY_ATTENDANCE_LABELS,
  SURVEY_SOURCE_LABELS,
  normalizeSurveySource,
} from "@/lib/ticket-orders/survey";
import { MERCH_OPTIONS, type MerchOption } from "@/lib/ticket-orders/validation";
import { GENDER_OPTIONS } from "./TicketAttendeeFields";
import type { SurveyAnswers } from "./TicketSurveyFields";
import { formatVnd, orderTotalVnd } from "./TicketOrderSummary";

export type ReviewDetails = Readonly<{ name: string; email: string; phone: string; gender: string; birthYear: string }>;

/** Snapshot of the step-1 fields shown on step 3; the request body is still built from FormData on submit. */
export function readReviewDetails(formData: FormData): ReviewDetails {
  const read = (key: string) => String(formData.get(key) ?? "").trim();
  return { name: read("name"), email: read("email"), phone: read("phone"), gender: read("gender"), birthYear: read("birthYear") };
}

type TicketOrderReviewProps = Readonly<{
  details: ReviewDetails | null;
  quantity: number;
  merch: MerchOption;
  survey: SurveyAnswers;
}>;

const notProvided = "Không cung cấp";

export function TicketOrderReview({ details, quantity, merch, survey }: TicketOrderReviewProps) {
  const gender = GENDER_OPTIONS.find((option) => option.value === details?.gender)?.label ?? GENDER_OPTIONS[0].label;
  const rows: readonly (readonly [string, string])[] = [
    ["Họ và tên", details?.name ?? ""],
    ["Email", details?.email ?? ""],
    ["Số điện thoại", details?.phone || notProvided],
    ["Năm sinh", details?.birthYear || notProvided],
    ["Giới tính", gender],
    ["Phiếu nước", `Phiếu nước × ${quantity}`],
    ["Merch", `${MERCH_OPTIONS[merch].label} · ${formatVnd(MERCH_OPTIONS[merch].priceVnd)}`],
    ["Biết đến qua", normalizeSurveySource(survey.source).map((id) => SURVEY_SOURCE_LABELS.get(id) ?? id).join(", ")],
    ["Khu vực", SURVEY_AREA_LABELS.get(survey.area) ?? ""],
    ["Tham gia", SURVEY_ATTENDANCE_LABELS.get(survey.attendance) ?? ""],
    ["Tổng tạm tính", formatVnd(orderTotalVnd(quantity, merch))],
  ];

  return (
    <>
      <dl className="ticket-request-dialog__review">
        {rows.map(([term, value]) => (
          <div key={term}>
            <dt>{term}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p className="ticket-request-dialog__note">
        Đơn sẽ chờ thanh toán; chưa có QR hoặc xác nhận phiếu nước. Sau khi bấm nút, bạn được chuyển sang PayOS để thanh toán.
      </p>
      <p className="ticket-request-dialog__note">Email nhập trên biểu mẫu sẽ được lưu cùng đơn hàng, kể cả khi khác email Google.</p>
    </>
  );
}
