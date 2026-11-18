import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  SURVEY_AREA_OPTIONS,
  SURVEY_ATTENDANCE_OPTIONS,
  SURVEY_SOURCE_OPTIONS,
} from "./survey";

const migration = readFileSync(
  fileURLToPath(new URL("../../../supabase/migrations/202611170003_ticket_order_survey.sql", import.meta.url)),
  "utf8",
);

// Each allowlist sits on exactly one line of the migration; extract its quoted ids.
function idsFrom(pattern: RegExp): string[] {
  const lines = migration.split(/\r?\n/).filter((line) => !line.trim().startsWith("--"));
  const matches = lines.flatMap((line) => {
    const match = pattern.exec(line);
    return match ? [match[1]] : [];
  });
  expect(matches, `exactly one allowlist line for ${pattern}`).toHaveLength(1);
  return [...matches[0].matchAll(/'([^']*)'/g)].map((match) => match[1]);
}

describe("survey migration allowlists match survey.ts", () => {
  it("keeps the source ids in the same set and canonical order", () => {
    const ids = idsFrom(/<@\s*array\[([^\]]*)\]/);
    expect(ids).toHaveLength(8);
    expect(ids).toEqual(SURVEY_SOURCE_OPTIONS.map((option) => option.id));
  });

  it("keeps the area ids in the same set", () => {
    const ids = idsFrom(/\barea\s+in\s*\(([^)]*)\)/);
    expect(ids).toHaveLength(8);
    expect([...ids].sort()).toEqual(SURVEY_AREA_OPTIONS.map((option) => option.id).sort());
  });

  it("keeps the attendance ids in the same set", () => {
    const ids = idsFrom(/\battendance\s+in\s*\(([^)]*)\)/);
    expect(ids).toHaveLength(2);
    expect([...ids].sort()).toEqual(SURVEY_ATTENDANCE_OPTIONS.map((option) => option.id).sort());
  });
});
