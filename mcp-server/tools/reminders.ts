import { osascript, asStringLiteral, asAppleScriptDate } from "../applescript.js";
import { text, ToolModule } from "./types.js";

export const reminders: ToolModule = {
  tools: [
    {
      name: "reminder_create",
      description: "Create a reminder in the Reminders app.",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string" },
          due: { type: "string", description: "ISO 8601 due date (optional)" },
          list: { type: "string" },
          notes: { type: "string" },
        },
        required: ["title"],
      },
    },
    {
      name: "reminder_list",
      description: "List incomplete reminders, optionally filtered to a list.",
      inputSchema: {
        type: "object",
        properties: {
          list: { type: "string" },
          limit: { type: "number", default: 25 },
        },
      },
    },
  ],
  handlers: {
    async reminder_create(args) {
      const title = String(args.title ?? "");
      const list = args.list ? String(args.list) : "Reminders";
      const notes = args.notes ? String(args.notes) : "";
      const dueBlock = args.due
        ? `${asAppleScriptDate(String(args.due), "d")}\nset due date of newRem to d`
        : "";
      const script = `
tell application "Reminders"
  tell list ${asStringLiteral(list)}
    set newRem to make new reminder with properties {name: ${asStringLiteral(title)}${notes ? `, body: ${asStringLiteral(notes)}` : ""}}
    ${dueBlock}
  end tell
end tell
return "ok"
`;
      await osascript(script);
      return text(
        `Reminder "${title}" added to ${list}${args.due ? ` (due ${new Date(String(args.due)).toLocaleString()})` : ""}.`,
      );
    },
    async reminder_list(args) {
      const limit = Number(args.limit ?? 25);
      const listClause = args.list
        ? `tell list ${asStringLiteral(String(args.list))}`
        : `tell default list`;
      const script = `
set output to ""
tell application "Reminders"
  ${listClause}
    set rems to (every reminder whose completed is false)
    repeat with r in rems
      set output to output & (name of r) & linefeed
    end repeat
  end tell
end tell
return output
`;
      const out = await osascript(script);
      const lines = out.split("\n").filter(Boolean).slice(0, limit);
      return text(lines.length === 0 ? "No open reminders." : lines.join("\n"));
    },
  },
};
