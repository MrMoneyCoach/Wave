#!/usr/bin/env node
/**
 * Writes a minimal package.json into dist-mcp so Node treats the compiled
 * output as an ES module (matching mcp-server/package.json).
 */
import { writeFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = resolve(__dirname, "..", "dist-mcp");
mkdirSync(out, { recursive: true });
writeFileSync(
  resolve(out, "package.json"),
  JSON.stringify({ type: "module", private: true }, null, 2),
  "utf8",
);
console.log("wrote dist-mcp/package.json");
