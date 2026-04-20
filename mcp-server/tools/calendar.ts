import { osascript, asStringLiteral, asAppleScriptDate } from "../applescript.js";
import { text, ToolModule } from "./types.js";

function addHour(iso: string, hours: number): string {
  const d = new Date(iso);
  d.setHours(d.getHours() + hours);
  return d.toISOString();
}

function todayRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
  return { from, to };
}

export const calendar: ToolModule = {
  tools: [
    {
      name: "calendar_create_event",
      description:
        "Create an event in the Mac Calendar. Dates use ISO 8601 (e.g. '2026-04-25T14:00'). If end is omitted, the event is one hour long.",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string" },
          start: { type: "string" },
          end: { type: "string" },
          notes: { type: "string" },
          location: { type: "string" },
          calendar: { type: "string" },
        },
        required: ["title", "start"],
      },
    },
    {
      name: "calendar_list_events",
      description: "List Calendar events between two ISO 8601 timestamps. Defaults to today.",
      inputSchema: {
        type: "object",
        properties: {
          from: { type: "string" },
          to: { type: "string" },
          calendar: { type: "string" },
        },
      },
    },
  ],
  handlers: {
    async calendar_create_event(args) {
      const title = String(args.title ?? "");
      const start = String(args.start ?? "");
      const end = args.end ? String(args.end) : addHour(start, 1);
      const notes = args.notes ? String(args.notes) : "";
      const location = args.location ? String(args.location) : "";
      const cal = args.calendar ? String(args.calendar) : "";
      const script = `
${asAppleScriptDate(start, "s")}
${asAppleScriptDate(end, "e")}
tell application "Calendar"
  ${cal ? `set theCal to calendar ${asStringLiteral(cal)}` : `set theCal to first calendar whose writable is true`}
  tell theCal
    make new event with properties {summary: ${asStringLiteral(title)}, start date: s, end date: e${notes ? `, description: ${asStringLiteral(notes)}` : ""}${location ? `, location: ${asStringLiteral(location)}` : ""}}
  end tell
end tell
return "ok"
`;
      await osascript(script);
      return text(
        `Event "${title}" created from ${new Date(start).toLocaleString()} to ${new Date(end).toLocaleString()}.`,
      );
    },
    async calendar_list_events(args) {
      const range = args.from || args.to ? null : todayRange();
      const from = String(args.from ?? range?.from ?? "");
      const to = String(args.to ?? range?.to ?? "");
      const calClause = args.calendar
        ? `calendar ${asStringLiteral(String(args.calendar))}`
        : `calendars`;
      const script = `
${asAppleScriptDate(from, "s")}
${asAppleScriptDate(to, "e")}
set output to ""
tell application "Calendar"
  repeat with c in (${calClause})
    repeat with ev in (every event of c whose start date is greater than or equal to s and start date is less than e)
      set output to output & (summary of ev) & " | " & (start date of ev as text) & linefeed
    end repeat
  end repeat
end tell
return output
`;
      const out = await osascript(script);
      return text(out.trim() || "No events in that range.");
    },
  },
};
