"use client";

import { useState } from "react";
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
      document.getElementById(groupId(idPrefix, firstInvalid))?.querySelector("input")?.focus();
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
  type: "checkbox" | "radio";
  options: readonly { id: string; label: string }[];
  isChecked: (id: string) => boolean;
  onToggle: (id: string, checked: boolean) => void;
}>;

function SurveyGroup({ field, idPrefix, survey, type, options, isChecked, onToggle }: GroupProps) {
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
      <legend className="ticket-request-dialog__survey-question">{SURVEY_QUESTIONS[field]}</legend>
      <div className="ticket-request-dialog__survey-options">
        {options.map((option) => (
          <label key={option.id} className="ticket-request-dialog__survey-option">
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
      {error && <p id={errorId} className="ticket-request-dialog__survey-error" role="alert">{error}</p>}
    </fieldset>
  );
}

export function TicketSurveyFields({ idPrefix, survey }: TicketSurveyFieldsProps) {
  const { answers, update } = survey;
  return (
    <div className="ticket-request-dialog__survey">
      <SurveyGroup
        field="source"
        idPrefix={idPrefix}
        survey={survey}
        type="checkbox"
        options={SURVEY_SOURCE_OPTIONS}
        isChecked={(id) => answers.source.includes(id)}
        onToggle={(id, checked) => update("source", {
          source: checked ? [...answers.source.filter((value) => value !== id), id] : answers.source.filter((value) => value !== id),
        })}
      />
      <SurveyGroup
        field="area"
        idPrefix={idPrefix}
        survey={survey}
        type="radio"
        options={SURVEY_AREA_OPTIONS}
        isChecked={(id) => answers.area === id}
        onToggle={(id) => update("area", { area: id })}
      />
      <SurveyGroup
        field="attendance"
        idPrefix={idPrefix}
        survey={survey}
        type="radio"
        options={SURVEY_ATTENDANCE_OPTIONS}
        isChecked={(id) => answers.attendance === id}
        onToggle={(id) => update("attendance", { attendance: id })}
      />
    </div>
  );
}
