import { execFile } from "child_process";
import { promisify } from "util";
import { osascript } from "../applescript.js";
import { text, ToolModule } from "./types.js";

const run = promisify(execFile);

function cleanHandle(s: string): string {
  // Strip spaces / parentheses / dashes; keep leading + and digits for phone,
  // or leave email addresses untouched.
  if (s.includes("@")) return s.trim();
  return s.replace(/[^0-9+]/g, "");
}

export const messages: ToolModule = {
  tools: [
    {
      name: "imessage_compose",
      description:
        "Open Messages (iMessage / SMS) with a recipient and optional body prefilled, so the user can review and hit Send. Use for 'text Sam that I'm running late'. Never sends automatically.",
      inputSchema: {
        type: "object",
        properties: {
          to: {
            type: "string",
            description: "Phone number (+15551234567) or Apple ID email",
          },
          body: { type: "string" },
        },
        required: ["to"],
      },
    },
  ],
  handlers: {
    async imessage_compose(args) {
      const handle = cleanHandle(String(args.to ?? ""));
      if (!handle) return text("Recipient required.", true);
      const body = String(args.body ?? "");
      const url =
        body.length > 0
          ? `sms:${handle}?body=${encodeURIComponent(body)}`
          : `sms:${handle}`;
      // `open` handles sms: URL scheme on macOS by launching Messages.
      await run("open", [url]);
      // Bring Messages forward so the composer is visible immediately.
      await osascript(`tell application "Messages" to activate`);
      return text(
        `Messages draft opened for ${handle}${body ? " with body prefilled" : ""}. Review and hit ⌘⏎ to send.`,
      );
    },
  },
};
