import { osascript, asStringLiteral } from "../applescript.js";
import { text, ToolModule } from "./types.js";

export const contacts: ToolModule = {
  tools: [
    {
      name: "contact_find",
      description:
        "Search the macOS Contacts app for people whose name contains the query. Returns name, emails, and phone numbers. Use this BEFORE outlook_compose / imessage_compose when the user refers to someone by first name ('email Sam', 'text mum').",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string" },
          limit: { type: "number", default: 10 },
        },
        required: ["query"],
      },
    },
  ],
  handlers: {
    async contact_find(args) {
      const q = String(args.query ?? "").trim();
      if (!q) return text("Query required.", true);
      const limit = Number(args.limit ?? 10);
      const script = `
set output to ""
set shown to 0
tell application "Contacts"
  set matches to (every person whose name contains ${asStringLiteral(q)})
  repeat with p in matches
    if shown >= ${limit} then exit repeat
    set nm to (name of p)
    set output to output & nm & linefeed
    try
      repeat with e in (every email of p)
        set output to output & "  email: " & (value of e) & linefeed
      end repeat
    end try
    try
      repeat with ph in (every phone of p)
        set output to output & "  phone: " & (value of ph) & linefeed
      end repeat
    end try
    set output to output & linefeed
    set shown to shown + 1
  end repeat
end tell
return output
`;
      const out = await osascript(script);
      return text(out.trim() || `No contacts match "${q}".`);
    },
  },
};
