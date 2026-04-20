import { osascript, asStringLiteral } from "../applescript.js";
import { text, ToolModule } from "./types.js";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const notes: ToolModule = {
  tools: [
    {
      name: "note_create",
      description: "Create a new note in the Notes app. Body supports basic HTML.",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string" },
          body: { type: "string" },
          folder: { type: "string" },
        },
        required: ["title", "body"],
      },
    },
    {
      name: "note_append",
      description: "Append text to a note (matched by title). Creates it if missing.",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string" },
          text: { type: "string" },
          folder: { type: "string" },
        },
        required: ["title", "text"],
      },
    },
  ],
  handlers: {
    async note_create(args) {
      const title = String(args.title ?? "");
      const body = String(args.body ?? "");
      const folder = args.folder ? String(args.folder) : "Notes";
      const html = `<div><h1>${escapeHtml(title)}</h1>${body}</div>`;
      const script = `
tell application "Notes"
  set targetFolder to missing value
  repeat with f in folders
    if name of f is ${asStringLiteral(folder)} then set targetFolder to f
  end repeat
  if targetFolder is missing value then set targetFolder to default folder
  tell targetFolder
    make new note with properties {name: ${asStringLiteral(title)}, body: ${asStringLiteral(html)}}
  end tell
end tell
return "ok"
`;
      await osascript(script);
      return text(`Note "${title}" created.`);
    },
    async note_append(args) {
      const title = String(args.title ?? "");
      const appendText = String(args.text ?? "");
      const folder = args.folder ? String(args.folder) : "Notes";
      const appendHtml = `<div><br>${escapeHtml(appendText).replace(/\n/g, "<br>")}</div>`;
      const script = `
tell application "Notes"
  set targetFolder to missing value
  repeat with f in folders
    if name of f is ${asStringLiteral(folder)} then set targetFolder to f
  end repeat
  if targetFolder is missing value then set targetFolder to default folder
  tell targetFolder
    set matches to (every note whose name is ${asStringLiteral(title)})
    if (count of matches) > 0 then
      set n to item 1 of matches
      set body of n to (body of n) & ${asStringLiteral(appendHtml)}
    else
      make new note with properties {name: ${asStringLiteral(title)}, body: ${asStringLiteral(`<div><h1>${escapeHtml(title)}</h1>${appendHtml}</div>`)}}
    end if
  end tell
end tell
return "ok"
`;
      await osascript(script);
      return text(`Appended to note "${title}".`);
    },
  },
};
