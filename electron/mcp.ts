import { app } from "electron";
import * as fs from "fs";
import * as path from "path";

/**
 * Writes an MCP config pointing Claude at our local Alfred MCP server
 * (file/URL/app tools). Returns the absolute path to the config file,
 * which we pass to `claude --mcp-config`.
 *
 * In dev the server lives at <repo>/dist-mcp/index.js (built by
 * `tsc -p mcp-server/tsconfig.json`). In a packaged app it's under
 * app.asar.unpacked because we asarUnpack the dir.
 */
function resolveServerPath(): string {
  if (app.isPackaged) {
    // asarUnpack puts dist-mcp alongside the asar at .../Resources/app.asar.unpacked
    const unpacked = path.join(process.resourcesPath, "app.asar.unpacked", "dist-mcp", "index.js");
    if (fs.existsSync(unpacked)) return unpacked;
    // fallback when unpack is off
    return path.join(app.getAppPath(), "dist-mcp", "index.js");
  }
  return path.resolve(__dirname, "..", "dist-mcp", "index.js");
}

function configDir(): string {
  const d = path.join(app.getPath("userData"), "mcp");
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  return d;
}

let cachedConfigPath: string | null = null;

export function ensureMcpConfig(): string | null {
  if (cachedConfigPath) return cachedConfigPath;
  const serverPath = resolveServerPath();
  if (!fs.existsSync(serverPath)) {
    console.warn("[alfred-mcp] server script missing at", serverPath);
    return null;
  }
  const config = {
    mcpServers: {
      alfred: {
        // ELECTRON_RUN_AS_NODE lets us reuse Electron's bundled Node
        // runtime, so the user doesn't need Node on PATH in production.
        command: process.execPath,
        args: [serverPath],
        env: { ELECTRON_RUN_AS_NODE: "1" },
      },
    },
  };
  const file = path.join(configDir(), "alfred.mcp.json");
  fs.writeFileSync(file, JSON.stringify(config, null, 2), "utf8");
  cachedConfigPath = file;
  return file;
}
