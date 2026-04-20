import { osascript, asStringLiteral } from "../applescript.js";
import { text, ToolModule } from "./types.js";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildRecipients(
  addresses: string[] | undefined,
  targetVar: string,
  kind: "recipient" | "cc recipient" | "bcc recipient",
): string {
  if (!addresses || addresses.length === 0) return "";
  return addresses
    .map(
      (addr) =>
        `make new ${kind} at ${targetVar} with properties {email address:{address:${asStringLiteral(
          addr,
        )}}}`,
    )
    .join("\n");
}

export const outlook: ToolModule = {
  tools: [
    {
      name: "outlook_compose",
      description:
        "Create and open a new email draft in Microsoft Outlook (Mac). Never sends automatically — the user reviews the window and hits send. Use this for any 'draft an email / send an email' request since the user runs Outlook for mail.",
      inputSchema: {
        type: "object",
        properties: {
          to: { type: "array", items: { type: "string" } },
          cc: { type: "array", items: { type: "string" } },
          bcc: { type: "array", items: { type: "string" } },
          subject: { type: "string" },
          body: {
            type: "string",
            description: "Plain text or simple HTML (wrap in <p>…</p>).",
          },
        },
        required: ["to", "subject", "body"],
      },
    },
    {
      name: "outlook_list_inbox",
      description: "List the most recent inbox messages (subject + sender).",
      inputSchema: {
        type: "object",
        properties: { limit: { type: "number", default: 15 } },
      },
    },
    {
      name: "outlook_search_inbox",
      description:
        "Search Outlook's inbox for messages whose subject or sender contains the query. Returns subject / sender / date.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string" },
          limit: { type: "number", default: 15 },
        },
        required: ["query"],
      },
    },
    {
      name: "outlook_open",
      description: "Bring Microsoft Outlook to the front.",
      inputSchema: { type: "object", properties: {} },
    },
  ],
  handlers: {
    async outlook_compose(args) {
      const subject = String(args.subject ?? "");
      const body = String(args.body ?? "");
      const to = Array.isArray(args.to) ? args.to.map(String) : [];
      const cc = Array.isArray(args.cc) ? args.cc.map(String) : [];
      const bcc = Array.isArray(args.bcc) ? args.bcc.map(String) : [];
      // Outlook's `content` accepts HTML; wrap plain text in <p> so line
      // breaks render.
      const looksLikeHtml = /<[a-z][\s\S]*>/i.test(body);
      const htmlBody = looksLikeHtml
        ? body
        : `<p>${escapeHtml(body).replace(/\n/g, "<br>")}</p>`;
      const script = `
tell application "Microsoft Outlook"
  activate
  set newMsg to make new outgoing message with properties {subject:${asStringLiteral(subject)}, content:${asStringLiteral(htmlBody)}}
  ${buildRecipients(to, "newMsg", "recipient")}
  ${buildRecipients(cc, "newMsg", "cc recipient")}
  ${buildRecipients(bcc, "newMsg", "bcc recipient")}
  open newMsg
end tell
return "ok"
`;
      await osascript(script);
      return text(
        `Drafted email to ${to.join(", ") || "(no recipient)"} with subject "${subject}". Review in Outlook and hit send.`,
      );
    },
    async outlook_list_inbox(args) {
      const limit = Number(args.limit ?? 15);
      const script = `
set output to ""
set n to 0
tell application "Microsoft Outlook"
  try
    set msgs to messages of inbox
  on error
    return "Couldn't read inbox — Outlook may not be signed in or scripting is disabled."
  end try
  repeat with m in msgs
    if n >= ${limit} then exit repeat
    try
      set subj to subject of m
    on error
      set subj to "(no subject)"
    end try
    try
      set snd to (sender of m) as text
    on error
      set snd to "(unknown sender)"
    end try
    set output to output & subj & " | " & snd & linefeed
    set n to n + 1
  end repeat
end tell
return output
`;
      const out = await osascript(script);
      return text(out.trim() || "Inbox is empty or unreadable.");
    },
    async outlook_search_inbox(args) {
      const q = String(args.query ?? "").toLowerCase();
      const limit = Number(args.limit ?? 15);
      const script = `
set output to ""
set n to 0
tell application "Microsoft Outlook"
  try
    set msgs to messages of inbox
  on error
    return ""
  end try
  repeat with m in msgs
    if n >= ${limit} then exit repeat
    try
      set subj to subject of m
    on error
      set subj to ""
    end try
    try
      set snd to (sender of m) as text
    on error
      set snd to ""
    end try
    set combined to (subj & " " & snd) as text
    if (do shell script "echo " & quoted form of combined & " | tr A-Z a-z") contains ${asStringLiteral(q)} then
      set output to output & subj & " | " & snd & linefeed
      set n to n + 1
    end if
  end repeat
end tell
return output
`;
      const out = await osascript(script);
      return text(out.trim() || `No matches for "${args.query}".`);
    },
    async outlook_open() {
      const script = `tell application "Microsoft Outlook" to activate`;
      await osascript(script);
      return text("Outlook is now in focus.");
    },
  },
};
