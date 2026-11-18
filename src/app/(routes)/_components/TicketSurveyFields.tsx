"use client";

import { useState, type ReactNode } from "react";
import {
  SURVEY_AREA_OPTIONS,
  SURVEY_ATTENDANCE_OPTIONS,
  SURVEY_QUESTIONS,
  SURVEY_SOURCE_OPTIONS,
  normalizeSurveySource,
  surveyFieldErrors,
  type SurveyField,
  type SurveyFieldErrors,
} from "@/lib/ticket-orders/survey";

export type SurveyAnswers = Readonly<{ source: string[]; area: string; attendance: string }>;

const emptyAnswers: SurveyAnswers = { source: [], area: "", attendance: "" };
const fieldOrder: readonly SurveyField[] = ["source", "area", "attendance"];

/** Survey state, per-group errors and focus handling for the ticket dialog. */
const groupId = (idPrefix: string, field: SurveyField) => `${idPrefix}-survey-${field}`;

export function useTicketSurvey(idPrefix: string) {
  const [answers, setAnswers] = useState<SurveyAnswers>(emptyAnswers);
  const [errors, setErrors] = useState<SurveyFieldErrors>({});

  function update(field: SurveyField, next: Partial<SurveyAnswers>) {
    setAnswers((current) => ({ ...current, ...next }));
    setErrors((current) => {
      if (!current[field]) return current;
      const rest = { ...current };
      delete rest[field];
      return rest;
    });
  }

  /** Returns the normalized survey, or null after showing errors and focusing the first invalid group. */
  function validate(): SurveyAnswers | null {
    const found = surveyFieldErrors(answers);
    setErrors(found);
    const firstInvalid = fieldOrder.find((field) => found[field]);
    if (firstInvalid) {
      document.getElementById(groupId(idPrefix, firstInvalid))?.querySelector<HTMLElement>("input, select")?.focus();
      return null;
    }
    return { source: normalizeSurveySource(answers.source), area: answers.area, attendance: answers.attendance };
  }

  function reset() {
    setAnswers(emptyAnswers);
    setErrors({});
  }

  return { answers, errors, update, validate, reset };
}

type TicketSurveyFieldsProps = Readonly<{
  idPrefix: string;
  survey: ReturnType<typeof useTicketSurvey>;
}>;

type GroupProps = Readonly<{
  field: SurveyField;
  idPrefix: string;
  survey: ReturnType<typeof useTicketSurvey>;
  children: ReactNode;
}>;

/** One question: a real fieldset/legend, the error linked by aria-describedby and data-invalid (not aria-invalid). */
function SurveyGroup({ field, idPrefix, survey, children }: GroupProps) {
  const error = survey.errors[field];
  const errorId = `${groupId(idPrefix, field)}-error`;
  return (
    <fieldset
      id={groupId(idPrefix, field)}
      className="ticket-request-dialog__survey-group"
      aria-describedby={error ? errorId : undefined}
      data-invalid={error ? "true" : undefined}
      data-field={field}
    >
      <legend id={`${groupId(idPrefix, field)}-legend`} className="ticket-request-dialog__survey-question">{SURVEY_QUESTIONS[field]}</legend>
      {children}
      {error && <p id={errorId} className="ticket-request-dialog__survey-error" role="alert">{error}</p>}
    </fieldset>
  );
}

type ChoiceProps = Readonly<{
  field: SurveyField;
  type: "checkbox" | "radio";
  variant: "chips" | "segmented";
  options: readonly { id: string; label: string }[];
  isChecked: (id: string) => boolean;
  onToggle: (id: string, checked: boolean) => void;
}>;

function ChoiceOptions({ field, type, variant, options, isChecked, onToggle }: ChoiceProps) {
  const optionClass = variant === "chips" ? "ticket-request-dialog__chip" : "ticket-request-dialog__segment";
  return (
    <div className={`ticket-request-dialog__${variant}`}>
      {options.map((option) => (
        <label key={option.id} className={optionClass}>
          <input
            type={type}
            name={`survey-${field}`}
            value={option.id}
            checked={isChecked(option.id)}
            onChange={(event) => onToggle(option.id, event.target.checked)}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  );
}

export function TicketSurveyFields({ idPrefix, survey }: TicketSurveyFieldsProps) {
  const { answers, update } = survey;
  return (
    <div className="ticket-request-dialog__survey">
      <SurveyGroup field="source" idPrefix={idPrefix} survey={survey}>
        <ChoiceOptions
          field="source"
          type="checkbox"
          variant="chips"
          options={SURVEY_SOURCE_OPTIONS}
          isChecked={(id) => answers.source.includes(id)}
          onToggle={(id, checked) => update("source", {
            source: checked ? [...answers.source.filter((value) => value !== id), id] : answers.source.filter((value) => value !== id),
          })}
        />
      </SurveyGroup>
      <SurveyGroup field="area" idPrefix={idPrefix} survey={survey}>
        <select
          className="ticket-request-dialog__survey-select"
          name="survey-area"
          aria-labelledby={`${groupId(idPrefix, "area")}-legend`}
          value={answers.area}
          onChange={(event) => update("area", { area: event.target.value })}
        >
          <option value="">Chọn khu vực</option>
          {SURVEY_AREA_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
      </SurveyGroup>
      <SurveyGroup field="attendance" idPrefix={idPrefix} survey={survey}>
        <ChoiceOptions
          field="attendance"
          type="radio"
          variant="segmented"
          options={SURVEY_ATTENDANCE_OPTIONS}
          isChecked={(id) => answers.attendance === id}
          onToggle={(id) => update("attendance", { attendance: id })}
        />
      </SurveyGroup>
    </div>
  );
}
