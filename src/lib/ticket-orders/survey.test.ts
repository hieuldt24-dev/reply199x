import { describe, expect, it } from "vitest";
import {
  SURVEY_AREA_LABELS,
  SURVEY_AREA_OPTIONS,
  SURVEY_ATTENDANCE_LABELS,
  SURVEY_ATTENDANCE_OPTIONS,
  SURVEY_QUESTIONS,
  SURVEY_READ_FAILED_CODE,
  SURVEY_RPC,
  SURVEY_SOURCE_LABELS,
  SURVEY_SOURCE_OPTIONS,
  normalizeSurveySource,
  parseSurvey,
  surveyFieldErrors,
  surveyToSheetCells,
} from "./survey";

const valid = { source: ["zalo", "facebook"], area: "hai-chau", attendance: "confirmed" };
const prototypeNames = ["constructor", "__proto__", "toString", "hasOwnProperty"];

describe("survey contract", () => {
  it("lists stable ids and verbatim labels in canonical order", () => {
    expect(SURVEY_SOURCE_OPTIONS.map((option) => option.id)).toEqual([
      "facebook", "zalo", "tiktok", "referral", "poster-standee", "popup-reply199x", "on-the-radio-bar", "website",
    ]);
    expect(SURVEY_SOURCE_OPTIONS.map((option) => option.label)).toEqual([
      "Facebook", "Zalo", "TikTok", "Người thân / Bạn bè / người quen giới thiệu", "Poster / Standee thông tin",
      "Tại Pop-up REPLY 199X", "Tại On The Radio Bar", "Tại website của REPLY 199X",
    ]);
    expect(SURVEY_AREA_OPTIONS.map((option) => option.id)).toEqual([
      "hai-chau", "thanh-khe", "son-tra", "ngu-hanh-son", "lien-chieu", "cam-le", "hoa-vang", "quang-nam-cu",
    ]);
    expect(SURVEY_AREA_OPTIONS.map((option) => option.label)).toEqual([
      "Hải Châu", "Thanh Khê", "Sơn Trà", "Ngũ Hành Sơn", "Liên Chiểu", "Cẩm Lệ", "Hòa Vang",
      "Khu vực Quảng Nam cũ (Hội An, Điện Bàn, Tam Kỳ...)",
    ]);
    expect(SURVEY_ATTENDANCE_OPTIONS).toEqual([
      { id: "confirmed", label: "Có, tôi chắc chắn mình sẽ tham gia" },
      { id: "unsure", label: "Tôi chưa chắc chắn mình sẽ tham gia" },
    ]);
    expect(SURVEY_SOURCE_LABELS.get("facebook")).toBe("Facebook");
    expect(SURVEY_AREA_LABELS.get("quang-nam-cu")).toBe("Khu vực Quảng Nam cũ (Hội An, Điện Bàn, Tam Kỳ...)");
    expect(SURVEY_ATTENDANCE_LABELS.get("unsure")).toBe("Tôi chưa chắc chắn mình sẽ tham gia");
  });

  it("keeps the verbatim question text including the space in Anh/ chị", () => {
    expect(SURVEY_QUESTIONS.source).toBe(
      'Anh/chị biết đến thông tin Sự kiện "KHÔNG GIAN ÂM NHẠC HOÀI NIỆM REPLY199X" này qua đâu? (Có thể chọn nhiều đáp án)',
    );
    expect(SURVEY_QUESTIONS.area).toBe("Anh/chị hiện đang sống ở khu vực nào? (theo tên quận/huyện cũ)");
    expect(SURVEY_QUESTIONS.attendance).toBe("Anh/ chị có chắc chắn mình sẽ có mặt tại sự kiện này không ạ?");
  });

  it("exposes the frozen RPC names and error code", () => {
    expect(SURVEY_RPC).toEqual({ upsert: "upsert_ticket_order_survey", get: "get_ticket_order_survey" });
    expect(SURVEY_READ_FAILED_CODE).toBe("survey_read_failed");
    expect(SURVEY_READ_FAILED_CODE).toMatch(/^[a-z0-9_]{1,80}$/u);
  });
});

describe("parseSurvey", () => {
  it("accepts allowlisted answers and normalizes Q6 to canonical order", () => {
    expect(parseSurvey(valid)).toEqual({ source: ["facebook", "zalo"], area: "hai-chau", attendance: "confirmed" });
    expect(parseSurvey({ ...valid, source: SURVEY_SOURCE_OPTIONS.map((option) => option.id).reverse() })?.source)
      .toEqual(SURVEY_SOURCE_OPTIONS.map((option) => option.id));
  });

  it("should normalize Q6 to canonical order regardless of click order", () => {
    const first = parseSurvey({ ...valid, source: ["website", "facebook", "referral"] });
    const second = parseSurvey({ ...valid, source: ["referral", "website", "facebook"] });
    expect(first).not.toBeNull();
    expect(first).toEqual(second);
    expect(normalizeSurveySource(["website", "facebook", "referral"])).toEqual(["facebook", "referral", "website"]);
  });

  it.each([
    ["null", null],
    ["array", [valid]],
    ["string", "survey"],
    ["missing source", { area: "hai-chau", attendance: "confirmed" }],
    ["missing area", { source: ["facebook"], attendance: "confirmed" }],
    ["missing attendance", { source: ["facebook"], area: "hai-chau" }],
    ["unknown key", { ...valid, other: "x" }],
    ["source not array", { ...valid, source: "facebook" }],
    ["source element not string", { ...valid, source: ["facebook", 1] }],
    ["source duplicate", { ...valid, source: ["facebook", "facebook"] }],
    ["source empty", { ...valid, source: [] }],
    ["source unknown id", { ...valid, source: ["instagram"] }],
    ["source label instead of id", { ...valid, source: ["Facebook"] }],
    ["source too many", { ...valid, source: [...SURVEY_SOURCE_OPTIONS.map((option) => option.id), "facebook"] }],
    ["area unknown", { ...valid, area: "hanoi" }],
    ["area wrong type", { ...valid, area: 1 }],
    ["area array", { ...valid, area: ["hai-chau"] }],
    ["attendance unknown", { ...valid, attendance: "maybe" }],
    ["attendance wrong type", { ...valid, attendance: true }],
    ["attendance null", { ...valid, attendance: null }],
  ])("should reject duplicate, empty, unknown and mistyped survey answers: %s", (_name, input) => {
    expect(parseSurvey(input)).toBeNull();
  });

  it.each(prototypeNames)("rejects the prototype-name id %s in every question", (name) => {
    expect(parseSurvey({ ...valid, source: [name] })).toBeNull();
    expect(parseSurvey({ ...valid, area: name })).toBeNull();
    expect(parseSurvey({ ...valid, attendance: name })).toBeNull();
  });

  it("rejects an own __proto__ key from JSON input", () => {
    expect(parseSurvey(JSON.parse('{"source":["facebook"],"area":"hai-chau","attendance":"confirmed","__proto__":{}}')))
      .toBeNull();
  });
});

describe("surveyFieldErrors", () => {
  it("returns no errors for a complete draft", () => {
    expect(surveyFieldErrors(valid)).toEqual({});
  });

  it("returns a Vietnamese message for each empty group", () => {
    const errors = surveyFieldErrors({ source: [], area: "", attendance: "" });
    expect(Object.keys(errors)).toEqual(["source", "area", "attendance"]);
    expect(errors.source).toBe("Vui lòng chọn ít nhất một đáp án.");
    expect(errors.area).toBe("Vui lòng chọn khu vực anh/chị đang sống.");
    expect(errors.attendance).toBe("Vui lòng cho biết anh/chị có chắc chắn tham gia không.");
  });

  it("flags only the invalid group", () => {
    expect(Object.keys(surveyFieldErrors({ ...valid, area: "" }))).toEqual(["area"]);
    expect(Object.keys(surveyFieldErrors({ ...valid, source: ["toString"] }))).toEqual(["source"]);
    expect(Object.keys(surveyFieldErrors({ ...valid, attendance: "constructor" }))).toEqual(["attendance"]);
  });
});

describe("surveyToSheetCells", () => {
  it("joins Q6 labels with ';' in canonical order and maps H and M labels", () => {
    const survey = parseSurvey({ source: ["website", "facebook"], area: "quang-nam-cu", attendance: "unsure" });
    expect(surveyToSheetCells(survey)).toEqual([
      "Facebook;Tại website của REPLY 199X",
      "Khu vực Quảng Nam cũ (Hội An, Điện Bàn, Tam Kỳ...)",
      "Tôi chưa chắc chắn mình sẽ tham gia",
    ]);
  });

  it("returns three empty cells when there is no survey", () => {
    expect(surveyToSheetCells(null)).toEqual(["", "", ""]);
  });

  it("maps a single-answer survey", () => {
    expect(surveyToSheetCells(parseSurvey({ source: ["tiktok"], area: "hai-chau", attendance: "confirmed" })))
      .toEqual(["TikTok", "Hải Châu", "Có, tôi chắc chắn mình sẽ tham gia"]);
  });
});
