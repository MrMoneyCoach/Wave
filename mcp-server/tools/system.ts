import { execFile } from "child_process";
import { promisify } from "util";
import { osascript } from "../applescript.js";
import { text, ToolModule } from "./types.js";

const run = promisify(execFile);

export const system: ToolModule = {
  tools: [
    {
      name: "system_get_volume",
      description: "Return the current output volume (0-100) and mute state.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "system_set_volume",
      description:
        "Set the output volume (0-100) and/or mute state. Either field is optional — pass only what you want to change.",
      inputSchema: {
        type: "object",
        properties: {
          level: { type: "number", minimum: 0, maximum: 100 },
          mute: { type: "boolean" },
        },
      },
    },
    {
      name: "system_sleep_display",
      description: "Turn the display off immediately (locks the screen if password-on-wake is set).",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "system_lock_screen",
      description: "Lock the screen (simulates Control+Command+Q).",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "system_battery_status",
      description: "Return a plain-English battery summary (percentage, charging state, time remaining).",
      inputSchema: { type: "object", properties: {} },
    },
  ],
  handlers: {
    async system_get_volume() {
      const out = await osascript(`
set s to get volume settings
set v to output volume of s
set m to output muted of s
return (v as text) & "|" & (m as text)
`);
      const [vStr, mStr] = out.trim().split("|");
      return text(`Volume ${vStr}%${mStr === "true" ? " (muted)" : ""}.`);
    },
    async system_set_volume(args) {
      const lines: string[] = [];
      if (typeof args.level === "number") {
        const lvl = Math.max(0, Math.min(100, Math.round(Number(args.level))));
        lines.push(`set volume output volume ${lvl}`);
      }
      if (typeof args.mute === "boolean") {
        lines.push(args.mute ? `set volume with output muted` : `set volume without output muted`);
      }
      if (lines.length === 0) return text("Nothing to change.", true);
      await osascript(lines.join("\n"));
      const bits = [];
      if (typeof args.level === "number") bits.push(`volume ${args.level}%`);
      if (typeof args.mute === "boolean") bits.push(args.mute ? "muted" : "unmuted");
      return text(`Set ${bits.join(", ")}.`);
    },
    async system_sleep_display() {
      await run("pmset", ["displaysleepnow"]);
      return text("Display sleeping.");
    },
    async system_lock_screen() {
      await osascript(`tell application "System Events" to keystroke "q" using {command down, control down}`);
      return text("Screen locked.");
    },
    async system_battery_status() {
      const { stdout } = await run("pmset", ["-g", "batt"]);
      // Typical line: "-InternalBattery-0 (id=…)\t85%; discharging; 3:24 remaining present: true"
      const match = stdout.match(/(\d+)%;\s+([^;]+);\s+([^\s]+)\s+remaining/);
      if (match) {
        const [, pct, state, remaining] = match;
        const nice = state.trim();
        if (remaining === "(no" || remaining === "0:00") {
          return text(`Battery ${pct}%, ${nice}.`);
        }
        return text(`Battery ${pct}%, ${nice}, about ${remaining} remaining.`);
      }
      const simple = stdout.match(/(\d+)%;\s+(charged|charging|discharging)/);
      if (simple) return text(`Battery ${simple[1]}%, ${simple[2]}.`);
      return text(stdout.trim() || "Couldn't read battery status.");
    },
  },
};
