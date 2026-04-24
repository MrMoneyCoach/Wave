import * as XLSX from "xlsx";

export type ParsedQuestion = {
  text: string;
  type: "single" | "multi" | "scale";
  required: boolean;
  options: { text: string; score: number }[];
};

export type ParsedOutcome = {
  minScore: number;
  maxScore: number;
  title: string;
  description: string;
};

export type ParseResult = {
  questions: ParsedQuestion[];
  outcomes: ParsedOutcome[];
  warnings: string[];
};

function pickSheet(wb: XLSX.WorkBook, candidates: string[]): XLSX.WorkSheet | null {
  const lower = wb.SheetNames.map((n) => n.toLowerCase());
  for (const c of candidates) {
    const idx = lower.indexOf(c.toLowerCase());
    if (idx >= 0) return wb.Sheets[wb.SheetNames[idx]];
  }
  return null;
}

function rowsOf(sheet: XLSX.WorkSheet): Record<string, unknown>[] {
  return XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
}

function norm(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function pick(row: Record<string, unknown>, names: string[]): string {
  const map: Record<string, string> = {};
  for (const k of Object.keys(row)) map[norm(k)] = String(row[k] ?? "").trim();
  for (const n of names) {
    const v = map[norm(n)];
    if (v !== undefined && v !== "") return v;
  }
  return "";
}

function coerceType(raw: string): "single" | "multi" | "scale" {
  const v = raw.toLowerCase().trim();
  if (v === "multi" || v === "multiple" || v === "checkbox") return "multi";
  if (v === "scale" || v === "rating" || v === "number") return "scale";
  return "single";
}

function coerceBool(raw: string): boolean {
  const v = raw.toLowerCase().trim();
  if (!v) return true;
  return !["no", "false", "0", "optional"].includes(v);
}

function num(raw: string): number {
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Accepts a workbook with any of:
 *  - A "Questions" sheet where each row is one option
 *      columns: Question, Type, Option, Score, Required (optional)
 *  - A single default sheet with the same columns
 *  - An "Outcomes" sheet
 *      columns: Min Score, Max Score, Title, Description
 *
 * Rows sharing the same Question text are grouped, preserving order of first appearance.
 */
export function parseWorkbook(buffer: ArrayBuffer): ParseResult {
  const wb = XLSX.read(buffer, { type: "array" });
  const warnings: string[] = [];

  const qSheet =
    pickSheet(wb, ["Questions", "Quiz", "Questionnaire"]) ??
    (wb.SheetNames.length > 0 ? wb.Sheets[wb.SheetNames[0]] : null);

  const questions: ParsedQuestion[] = [];

  if (!qSheet) {
    warnings.push("No sheets found in the workbook.");
  } else {
    const rows = rowsOf(qSheet);
    const byText = new Map<string, ParsedQuestion>();

    for (const [i, row] of rows.entries()) {
      const qText = pick(row, ["Question", "Q", "Prompt"]);
      if (!qText) {
        if (Object.values(row).some((v) => String(v).trim() !== "")) {
          warnings.push(`Row ${i + 2}: skipped (no question text).`);
        }
        continue;
      }
      const optionText = pick(row, ["Option", "Answer", "Choice"]);
      const scoreRaw = pick(row, ["Score", "Points", "Weight"]);
      const typeRaw = pick(row, ["Type", "QuestionType"]);
      const requiredRaw = pick(row, ["Required", "Mandatory"]);

      let q = byText.get(qText);
      if (!q) {
        q = {
          text: qText,
          type: coerceType(typeRaw),
          required: coerceBool(requiredRaw),
          options: [],
        };
        byText.set(qText, q);
        questions.push(q);
      } else if (typeRaw) {
        q.type = coerceType(typeRaw);
      }

      if (optionText) {
        q.options.push({ text: optionText, score: num(scoreRaw) });
      }
    }

    for (const q of questions) {
      if (q.options.length === 0 && q.type !== "scale") {
        warnings.push(`Question "${q.text}" has no options.`);
      }
    }
  }

  const outcomes: ParsedOutcome[] = [];
  const oSheet = pickSheet(wb, ["Outcomes", "Results", "Bands"]);
  if (oSheet) {
    const rows = rowsOf(oSheet);
    for (const [i, row] of rows.entries()) {
      const title = pick(row, ["Title", "Name", "Outcome"]);
      if (!title) continue;
      const minRaw = pick(row, ["Min Score", "Min", "From"]);
      const maxRaw = pick(row, ["Max Score", "Max", "To"]);
      const description = pick(row, ["Description", "Body", "Message"]);
      const minScore = num(minRaw);
      const maxScore = num(maxRaw || "100");
      if (maxScore < minScore) {
        warnings.push(`Outcomes row ${i + 2}: max (${maxScore}) is less than min (${minScore}).`);
      }
      outcomes.push({ minScore, maxScore, title, description });
    }
  }

  return { questions, outcomes, warnings };
}
