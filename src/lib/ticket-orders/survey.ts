// Shared ticket-order survey contract (frozen in P1). Pure module: used by the form, route, worker and Sheet adapter.

export const SURVEY_SOURCE_OPTIONS = [
  { id: "facebook", label: "Facebook" },
  { id: "zalo", label: "Zalo" },
  { id: "tiktok", label: "TikTok" },
  { id: "referral", label: "Người thân / Bạn bè / người quen giới thiệu" },
  { id: "poster-standee", label: "Poster / Standee thông tin" },
  { id: "popup-reply199x", label: "Tại Pop-up REPLY 199X" },
  { id: "on-the-radio-bar", label: "Tại On The Radio Bar" },
  { id: "website", label: "Tại website của REPLY 199X" },
] as const;

export const SURVEY_AREA_OPTIONS = [
  { id: "hai-chau", label: "Hải Châu" },
  { id: "thanh-khe", label: "Thanh Khê" },
  { id: "son-tra", label: "Sơn Trà" },
  { id: "ngu-hanh-son", label: "Ngũ Hành Sơn" },
  { id: "lien-chieu", label: "Liên Chiểu" },
  { id: "cam-le", label: "Cẩm Lệ" },
  { id: "hoa-vang", label: "Hòa Vang" },
  { id: "quang-nam-cu", label: "Khu vực Quảng Nam cũ (Hội An, Điện Bàn, Tam Kỳ...)" },
] as const;

export const SURVEY_ATTENDANCE_OPTIONS = [
  { id: "confirmed", label: "Có, tôi chắc chắn mình sẽ tham gia" },
  { id: "unsure", label: "Tôi chưa chắc chắn mình sẽ tham gia" },
] as const;

export const SURVEY_QUESTIONS = {
  source: 'Anh/chị biết đến thông tin Sự kiện "KHÔNG GIAN ÂM NHẠC HOÀI NIỆM REPLY199X" này qua đâu? (Có thể chọn nhiều đáp án)',
  area: "Anh/chị hiện đang sống ở khu vực nào? (theo tên quận/huyện cũ)",
  attendance: "Anh/ chị có chắc chắn mình sẽ có mặt tại sự kiện này không ạ?",
} as const;

export const SURVEY_RPC = { upsert: "upsert_ticket_order_survey", get: "get_ticket_order_survey" } as const;
export const SURVEY_READ_FAILED_CODE = "survey_read_failed";

export type SurveySourceId = (typeof SURVEY_SOURCE_OPTIONS)[number]["id"];
export type SurveyAreaId = (typeof SURVEY_AREA_OPTIONS)[number]["id"];
export type SurveyAttendanceId = (typeof SURVEY_ATTENDANCE_OPTIONS)[number]["id"];
export type SurveyField = "source" | "area" | "attendance";

export type TicketSurvey = Readonly<{
  source: readonly SurveySourceId[];
  area: SurveyAreaId;
  attendance: SurveyAttendanceId;
}>;

export type SurveyDraft = Readonly<{
  source: readonly string[];
  area: string;
  attendance: string;
}>;

export type SurveyFieldErrors = Partial<Record<SurveyField, string>>;

// Map lookups (never `in` or plain indexing) so prototype names such as "constructor" are not valid ids.
function labelMap<Id extends string>(options: readonly { id: Id; label: string }[]): ReadonlyMap<string, string> {
  return new Map(options.map((option) => [option.id, option.label]));
}

export const SURVEY_SOURCE_LABELS = labelMap(SURVEY_SOURCE_OPTIONS);
export const SURVEY_AREA_LABELS = labelMap(SURVEY_AREA_OPTIONS);
export const SURVEY_ATTENDANCE_LABELS = labelMap(SURVEY_ATTENDANCE_OPTIONS);

const sourceOrder: ReadonlyMap<string, number> = new Map(SURVEY_SOURCE_OPTIONS.map((option, index) => [option.id, index]));
const surveyKeys: readonly string[] = ["source", "area", "attendance"];

const fieldMessages: Readonly<Record<SurveyField, string>> = {
  source: "Vui lòng chọn ít nhất một đáp án.",
  area: "Vui lòng chọn khu vực anh/chị đang sống.",
  attendance: "Vui lòng cho biết anh/chị có chắc chắn tham gia không.",
};

/** Sorts known source ids into canonical order; unknown ids sort last in their original order. */
export function normalizeSurveySource(source: readonly string[]): string[] {
  const rank = (id: string) => sourceOrder.get(id) ?? sourceOrder.size;
  return [...source].sort((left, right) => rank(left) - rank(right));
}

function isValidSource(source: unknown): source is readonly SurveySourceId[] {
  if (!Array.isArray(source) || source.length < 1 || source.length > SURVEY_SOURCE_OPTIONS.length) return false;
  if (!source.every((id) => typeof id === "string" && SURVEY_SOURCE_LABELS.has(id))) return false;
  return new Set(source).size === source.length;
}

function isValidArea(area: unknown): area is SurveyAreaId {
  return typeof area === "string" && SURVEY_AREA_LABELS.has(area);
}

function isValidAttendance(attendance: unknown): attendance is SurveyAttendanceId {
  return typeof attendance === "string" && SURVEY_ATTENDANCE_LABELS.has(attendance);
}

/** Accepts only an object with exactly source/area/attendance holding allowlisted ids. */
export function parseSurvey(value: unknown): TicketSurvey | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const keys = Object.keys(value);
  if (keys.length !== surveyKeys.length || !keys.every((key) => surveyKeys.includes(key))) return null;
  const record = value as Record<string, unknown>;
  if (!isValidSource(record.source) || !isValidArea(record.area) || !isValidAttendance(record.attendance)) return null;
  return {
    source: normalizeSurveySource(record.source) as SurveySourceId[],
    area: record.area,
    attendance: record.attendance,
  };
}

/** Per-group Vietnamese messages for the form; an empty object means the draft is valid. */
export function surveyFieldErrors(draft: SurveyDraft): SurveyFieldErrors {
  const errors: SurveyFieldErrors = {};
  if (!isValidSource(draft.source)) errors.source = fieldMessages.source;
  if (!isValidArea(draft.area)) errors.area = fieldMessages.area;
  if (!isValidAttendance(draft.attendance)) errors.attendance = fieldMessages.attendance;
  return errors;
}

/** Sheet cells [G, H, M]: Q6 labels joined with ";" in canonical order; no survey gives three empty strings. */
export function surveyToSheetCells(survey: TicketSurvey | null): readonly [string, string, string] {
  if (!survey) return ["", "", ""];
  const source = normalizeSurveySource(survey.source).map((id) => SURVEY_SOURCE_LABELS.get(id) ?? "").join(";");
  return [source, SURVEY_AREA_LABELS.get(survey.area) ?? "", SURVEY_ATTENDANCE_LABELS.get(survey.attendance) ?? ""];
}
