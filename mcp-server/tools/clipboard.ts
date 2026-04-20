import { execFile } from "child_process";
import { osascript } from "../applescript.js";
import { text, ToolModule } from "./types.js";
import { promisify } from "util";

const run = promisify(execFile);

function pbcopy(s: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = execFile("pbcopy", [], (err) => (err ? reject(err) : resolve()));
    child.stdin?.end(s);
  });
}

export const clipboard: ToolModule = {
  tools: [
    {
      name: "clipboard_get",
      description: "Return the current clipboard text.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "clipboard_set",
      description: "Replace the clipboard with the given text.",
      inputSchema: {
        type: "object",
        properties: { text: { type: "string" } },
        required: ["text"],
      },
    },
    {
      name: "paste_text",
      description:
        "Type text into whatever app the user was using before Alfred. Switches via Cmd+Tab and pastes. Use for 'type this into the email I'm writing' or 'paste into the doc I have open'. Requires Accessibility permission once.",
      inputSchema: {
        type: "object",
        properties: { text: { type: "string" } },
        required: ["text"],
      },
    },
  ],
  handlers: {
    async clipboard_get() {
      const { stdout } = await run("pbpaste", []);
      return text(stdout || "(clipboard is empty)");
    },
    async clipboard_set(args) {
      await pbcopy(String(args.text ?? ""));
      return text("Clipboard set.");
    },
    async paste_text(args) {
      const payload = String(args.text ?? "");
      if (!payload) return text("Nothing to paste.", true);
      await pbcopy(payload);
      const script = `
tell application "System Events"
  key code 48 using {command down}
  delay 0.25
  keystroke "v" using {command down}
end tell
return "ok"
`;
      try {
        await osascript(script);
        return text("Pasted into the previous app.");
      } catch (err) {
        return text(
          `Couldn't paste automatically (${(err as Error).message}). Text is on your clipboard — press ⌘V to paste.`,
          true,
        );
      }
    },
  },
};
