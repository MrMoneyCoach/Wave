export type ToolResult = {
  isError?: boolean;
  content: Array<{ type: "text"; text: string }>;
};

export type ToolDef = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

export type ToolModule = {
  tools: ToolDef[];
  handlers: Record<string, (args: any) => Promise<ToolResult>>;
};

export function text(s: string, isError = false): ToolResult {
  return { isError, content: [{ type: "text", text: s }] };
}
