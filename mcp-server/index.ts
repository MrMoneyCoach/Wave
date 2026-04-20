#!/usr/bin/env node
/**
 * Alfred MCP server — local tools for the user's Mac. Launched as a stdio
 * subprocess by the `claude` CLI via the per-session --mcp-config written
 * by the Electron app.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { text, ToolModule } from "./tools/types.js";

import { web } from "./tools/web.js";
import { linkedin } from "./tools/linkedin.js";
import { calendar } from "./tools/calendar.js";
import { reminders } from "./tools/reminders.js";
import { notes } from "./tools/notes.js";
import { clipboard } from "./tools/clipboard.js";
import { outlook } from "./tools/outlook.js";
import { office } from "./tools/office.js";
import { chrome } from "./tools/chrome.js";
import { messages } from "./tools/messages.js";
import { contacts } from "./tools/contacts.js";
import { system } from "./tools/system.js";

const MODULES: ToolModule[] = [
  web,
  linkedin,
  calendar,
  reminders,
  notes,
  clipboard,
  outlook,
  office,
  chrome,
  messages,
  contacts,
  system,
];

const tools = MODULES.flatMap((m) => m.tools);
const handlers: Record<string, (args: any) => Promise<any>> = Object.fromEntries(
  MODULES.flatMap((m) => Object.entries(m.handlers)),
);

const server = new Server(
  { name: "alfred", version: "0.2.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params;
  const handler = handlers[name];
  if (!handler) return text(`Unknown tool: ${name}`, true);
  try {
    return await handler(args);
  } catch (err) {
    return text((err as Error).message ?? String(err), true);
  }
});

await server.connect(new StdioServerTransport());
