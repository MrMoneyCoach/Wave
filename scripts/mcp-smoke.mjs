#!/usr/bin/env node
/**
 * CI smoke test: spawns the Alfred MCP server and issues a ListTools
 * request over its stdio transport. Fails loudly if any expected tool
 * is missing, or if the server errors out.
 */
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const server = resolve(__dirname, "..", "dist-mcp", "index.js");

const EXPECTED = [
  "open_url",
  "open_site_search",
  "find_files",
  "reveal_file",
  "open_file",
  "open_app",
  "linkedin_jobs_search",
  "linkedin_people_search",
  "linkedin_company_search",
  "linkedin_goto",
  "linkedin_compose_post",
  "linkedin_messaging",
  "linkedin_people_by_company",
  "linkedin_alumni_search",
  "linkedin_open_job",
  "linkedin_open_profile",
  "chrome_list_tabs",
  "chrome_focus_tab",
  "chrome_close_tabs",
  "chrome_reload_active",
  "calendar_create_event",
  "calendar_list_events",
  "reminder_create",
  "reminder_list",
  "note_create",
  "note_append",
  "clipboard_get",
  "clipboard_set",
  "paste_text",
  "outlook_compose",
  "outlook_list_inbox",
  "outlook_search_inbox",
  "outlook_open",
  "word_new_document",
  "word_open",
  "word_insert_text",
  "excel_new_workbook",
  "excel_open",
  "excel_append_rows",
  "excel_set_cell",
  "excel_read_range",
];

const child = spawn("node", [server], { stdio: ["pipe", "pipe", "inherit"] });

let buf = "";
let done = false;

function fail(msg) {
  console.error("SMOKE FAIL:", msg);
  child.kill("SIGTERM");
  process.exit(1);
}

const timer = setTimeout(() => fail("timeout waiting for MCP response"), 5000);

child.stdout.on("data", (chunk) => {
  buf += chunk.toString("utf8");
  let idx;
  while ((idx = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, idx).trim();
    buf = buf.slice(idx + 1);
    if (!line || done) continue;
    let msg;
    try { msg = JSON.parse(line); } catch { continue; }
    if (msg.id !== 1) continue;
    done = true;
    clearTimeout(timer);
    if (msg.error) fail(`server returned error: ${JSON.stringify(msg.error)}`);
    const tools = (msg.result?.tools ?? []).map((t) => t.name);
    const missing = EXPECTED.filter((n) => !tools.includes(n));
    if (missing.length > 0) fail(`missing tools: ${missing.join(", ")}`);
    console.log(`Smoke OK — ${tools.length} tools exposed.`);
    child.kill("SIGTERM");
    process.exit(0);
  }
});

child.on("error", (err) => fail(`spawn failed: ${err.message}`));
child.on("exit", (code) => {
  if (!done) fail(`server exited early (code ${code})`);
});

// Send MCP handshake + ListTools.
const initialize = {
  jsonrpc: "2.0",
  id: 0,
  method: "initialize",
  params: {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "alfred-smoke", version: "0.1.0" },
  },
};
const list = { jsonrpc: "2.0", id: 1, method: "tools/list", params: {} };
child.stdin.write(JSON.stringify(initialize) + "\n");
child.stdin.write(JSON.stringify(list) + "\n");
