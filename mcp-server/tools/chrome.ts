import { osascript, asStringLiteral } from "../applescript.js";
import { text, ToolModule } from "./types.js";

export const chrome: ToolModule = {
  tools: [
    {
      name: "chrome_list_tabs",
      description:
        "List the URL and title of every currently-open Chrome tab across all windows. Useful for 'what tabs do I have open?' questions.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "chrome_focus_tab",
      description:
        "Bring the first Chrome tab whose URL or title matches the query to the front.",
      inputSchema: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
      },
    },
    {
      name: "chrome_close_tabs",
      description:
        "Close every Chrome tab whose URL or title matches the query. Returns how many were closed.",
      inputSchema: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
      },
    },
    {
      name: "chrome_reload_active",
      description: "Reload the active tab of the frontmost Chrome window.",
      inputSchema: { type: "object", properties: {} },
    },
  ],
  handlers: {
    async chrome_list_tabs() {
      const script = `
set output to ""
tell application "Google Chrome"
  repeat with w in windows
    repeat with t in tabs of w
      set output to output & (title of t) & " | " & (URL of t) & linefeed
    end repeat
  end repeat
end tell
return output
`;
      const out = await osascript(script);
      return text(out.trim() || "No Chrome tabs open.");
    },
    async chrome_focus_tab(args) {
      const q = String(args.query ?? "").toLowerCase();
      const script = `
set found to false
tell application "Google Chrome"
  activate
  repeat with w in windows
    set ti to 0
    repeat with t in tabs of w
      set ti to ti + 1
      set hay to ((title of t) & " " & (URL of t))
      if (do shell script "echo " & quoted form of hay & " | tr A-Z a-z") contains ${asStringLiteral(q)} then
        set active tab index of w to ti
        set index of w to 1
        set found to true
        return (title of t)
      end if
    end repeat
  end repeat
end tell
return ""
`;
      const out = await osascript(script);
      return text(out.trim() ? `Focused: ${out.trim()}` : `No tab matches "${args.query}".`);
    },
    async chrome_close_tabs(args) {
      const q = String(args.query ?? "").toLowerCase();
      const script = `
set killed to 0
tell application "Google Chrome"
  repeat with w in windows
    set toClose to {}
    repeat with t in tabs of w
      set hay to ((title of t) & " " & (URL of t))
      if (do shell script "echo " & quoted form of hay & " | tr A-Z a-z") contains ${asStringLiteral(q)} then
        set end of toClose to t
      end if
    end repeat
    repeat with t in toClose
      close t
      set killed to killed + 1
    end repeat
  end repeat
end tell
return killed as text
`;
      const out = await osascript(script);
      return text(`Closed ${out.trim() || 0} tab(s).`);
    },
    async chrome_reload_active() {
      const script = `
tell application "Google Chrome"
  reload active tab of front window
end tell
return "ok"
`;
      await osascript(script);
      return text("Reloaded the active Chrome tab.");
    },
  },
};
