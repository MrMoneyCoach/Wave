import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { supabaseFromRequest, corsHeaders, corsPreflight } from "@/lib/supabase/auth";

// Empty string clears a field; omitted fields are left untouched.
const Body = z.object({
  display_name: z.string().max(80).optional(),
  slack_webhook_url: z
    .string()
    .url()
    .startsWith("https://hooks.slack.com/", "That doesn't look like a Slack incoming webhook URL.")
    .or(z.literal(""))
    .optional(),
  notion_token: z.string().max(200).optional(),
  notion_parent_page_id: z.string().max(80).optional(),
});

export function OPTIONS() {
  return corsPreflight();
}

export async function PATCH(request: NextRequest) {
  const { supabase, user } = await supabaseFromRequest(request);
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: corsHeaders() });

  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await request.json());
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "invalid_body" },
      { status: 400, headers: corsHeaders() },
    );
  }

  const update: Record<string, string | null> = {};
  for (const key of [
    "display_name",
    "slack_webhook_url",
    "notion_token",
    "notion_parent_page_id",
  ] as const) {
    if (parsed[key] !== undefined) {
      const trimmed = parsed[key]!.trim();
      update[key] = trimmed === "" ? null : trimmed;
    }
  }

  if (Object.keys(update).length === 0)
    return NextResponse.json({ ok: true }, { headers: corsHeaders() });

  const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400, headers: corsHeaders() });
  return NextResponse.json({ ok: true }, { headers: corsHeaders() });
}
