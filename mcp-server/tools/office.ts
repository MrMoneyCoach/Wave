import { osascript, asStringLiteral } from "../applescript.js";
import { text, ToolModule } from "./types.js";

function escapeAppleScriptText(s: string): string {
  // AppleScript literal-safe
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, "\\n");
}

export const office: ToolModule = {
  tools: [
    /* -------------------- Word -------------------- */
    {
      name: "word_new_document",
      description:
        "Create a new Word document with the given text (plain text; paragraph breaks preserved). Optionally save to a path.",
      inputSchema: {
        type: "object",
        properties: {
          text: { type: "string" },
          savePath: { type: "string", description: "Optional absolute path to save the .docx" },
        },
        required: ["text"],
      },
    },
    {
      name: "word_open",
      description: "Open an existing .docx / .doc file in Microsoft Word.",
      inputSchema: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"],
      },
    },
    {
      name: "word_insert_text",
      description:
        "Insert text at the cursor in the frontmost Microsoft Word document. Use when the user says 'type this into the Word doc I have open'. Activates Word.",
      inputSchema: {
        type: "object",
        properties: { text: { type: "string" } },
        required: ["text"],
      },
    },

    /* -------------------- Excel -------------------- */
    {
      name: "excel_new_workbook",
      description:
        "Create a new Excel workbook. Optionally seed it with rows (2D array of strings/numbers). Optionally save to a path.",
      inputSchema: {
        type: "object",
        properties: {
          rows: {
            type: "array",
            items: { type: "array", items: {} },
            description: "2D array: rows[i][j] is the value for column j of row i.",
          },
          savePath: { type: "string" },
        },
      },
    },
    {
      name: "excel_open",
      description: "Open an existing Excel file.",
      inputSchema: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"],
      },
    },
    {
      name: "excel_append_rows",
      description:
        "Append rows (2D array) to the bottom of the active sheet of the active Excel workbook.",
      inputSchema: {
        type: "object",
        properties: {
          rows: { type: "array", items: { type: "array", items: {} } },
        },
        required: ["rows"],
      },
    },
    {
      name: "excel_set_cell",
      description:
        "Set a single cell's value on the active sheet of the active Excel workbook (e.g. 'A1').",
      inputSchema: {
        type: "object",
        properties: {
          cell: { type: "string" },
          value: {},
        },
        required: ["cell", "value"],
      },
    },
    {
      name: "excel_read_range",
      description:
        "Read values from a range on the active sheet (e.g. 'A1:C10') and return them as tab-separated lines.",
      inputSchema: {
        type: "object",
        properties: { range: { type: "string" } },
        required: ["range"],
      },
    },
  ],
  handlers: {
    /* ---------- Word ---------- */
    async word_new_document(args) {
      const body = String(args.text ?? "");
      const save = args.savePath ? String(args.savePath) : "";
      const script = `
tell application "Microsoft Word"
  activate
  set newDoc to make new document
  set content of text object of newDoc to ${asStringLiteral(body)}
  ${save ? `save as newDoc file name ${asStringLiteral(save)}` : ""}
end tell
return "ok"
`;
      await osascript(script);
      return text(save ? `New Word document saved at ${save}.` : "New Word document created.");
    },
    async word_open(args) {
      const p = String(args.path ?? "");
      const script = `
tell application "Microsoft Word"
  activate
  open ${asStringLiteral(p)}
end tell
return "ok"
`;
      await osascript(script);
      return text(`Opened ${p} in Word.`);
    },
    async word_insert_text(args) {
      const body = String(args.text ?? "");
      const script = `
tell application "Microsoft Word"
  activate
  tell selection to type text text ${asStringLiteral(body)}
end tell
return "ok"
`;
      await osascript(script);
      return text("Inserted into Word at the cursor.");
    },

    /* ---------- Excel ---------- */
    async excel_new_workbook(args) {
      const rows: unknown[][] = Array.isArray(args.rows) ? args.rows : [];
      const save = args.savePath ? String(args.savePath) : "";
      const cellSets = rows
        .flatMap((row, r) =>
          (row as unknown[]).map((val, c) => {
            const cellRef = `${columnLetter(c)}${r + 1}`;
            return `set value of cell ${asStringLiteral(cellRef)} of ws to "${escapeAppleScriptText(
              String(val ?? ""),
            )}"`;
          }),
        )
        .join("\n");
      const script = `
tell application "Microsoft Excel"
  activate
  set wb to make new workbook
  set ws to active sheet of wb
  ${cellSets}
  ${save ? `save workbook as wb filename ${asStringLiteral(save)}` : ""}
end tell
return "ok"
`;
      await osascript(script);
      return text(
        save
          ? `Workbook saved at ${save} with ${rows.length} row(s).`
          : `Workbook created with ${rows.length} row(s).`,
      );
    },
    async excel_open(args) {
      const p = String(args.path ?? "");
      const script = `
tell application "Microsoft Excel"
  activate
  open ${asStringLiteral(p)}
end tell
return "ok"
`;
      await osascript(script);
      return text(`Opened ${p} in Excel.`);
    },
    async excel_append_rows(args) {
      const rows: unknown[][] = Array.isArray(args.rows) ? args.rows : [];
      if (rows.length === 0) return text("No rows provided.", true);
      const cellSets = rows
        .flatMap((row, r) =>
          (row as unknown[]).map(
            (val, c) =>
              `set value of cell (${asStringLiteral(columnLetter(c))} & (sr + ${r})) of ws to "${escapeAppleScriptText(String(val ?? ""))}"`,
          ),
        )
        .join("\n  ");
      const script = `
tell application "Microsoft Excel"
  activate
  set ws to active sheet of active workbook
  set lastRow to count of rows of used range of ws
  set sr to lastRow + 1
  ${cellSets}
end tell
return "ok"
`;
      await osascript(script);
      return text(`Appended ${rows.length} row(s).`);
    },
    async excel_set_cell(args) {
      const cell = String(args.cell ?? "A1");
      const value = args.value;
      const script = `
tell application "Microsoft Excel"
  activate
  set ws to active sheet of active workbook
  set value of cell ${asStringLiteral(cell)} of ws to "${escapeAppleScriptText(String(value ?? ""))}"
end tell
return "ok"
`;
      await osascript(script);
      return text(`Set ${cell} = ${String(value)}`);
    },
    async excel_read_range(args) {
      const range = String(args.range ?? "A1");
      const script = `
set output to ""
tell application "Microsoft Excel"
  set ws to active sheet of active workbook
  set theRange to range ${asStringLiteral(range)} of ws
  set vals to value of theRange
  repeat with row in vals
    set rowOut to ""
    repeat with cell in row
      set rowOut to rowOut & (cell as text) & tab
    end repeat
    set output to output & rowOut & linefeed
  end repeat
end tell
return output
`;
      const out = await osascript(script);
      return text(out.trim() || "Range is empty.");
    },
  },
};

function columnLetter(idx: number): string {
  let s = "";
  let n = idx;
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}
