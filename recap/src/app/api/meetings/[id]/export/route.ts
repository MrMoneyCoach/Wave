import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { supabaseFromRequest, corsHeaders, corsPreflight } from "@/lib/supabase/auth";
import { siteUrl } from "@/lib/stripe";
import { exportToNotion, postToSlack } from "@/lib/integrations";
import type { Template } from "@/lib/types";

const Body = z.object({ target: z.enum(["slack", "notion"]) });

export function OPTIONS() {
  return corsPreflight();
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
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

  const [{ data: meeting }, { data: profile }] = await Promise.all([
    supabase
      .from("meetings")
      .select("id, owner_id, title, summary, template_id, public_share_token")
      .eq("id", params.id)
      .eq("owner_id", user.id)
      .single(),
    supabase
      .from("profiles")
      .select("slack_webhook_url, notion_token, notion_parent_page_id")
      .eq("id", user.id)
      .single(),
  ]);

  if (!meeting)
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: corsHeaders() });
  if (!meeting.summary)
    return NextResponse.json(
      { error: "This meeting doesn't have a summary yet." },
      { status: 400, headers: corsHeaders() },
    );

  let template: Pick<Template, "name" | "sections"> | null = null;
  if (meeting.template_id) {
    const { data: tpl } = await supabase
      .from("templates")
      .select("name, sections")
      .eq("id", meeting.template_id)
      .single();
    template = (tpl as Pick<Template, "name" | "sections"> | null) ?? null;
  }

  const shareUrl = meeting.public_share_token
    ? `${siteUrl()}/share/${meeting.public_share_token}`
    : `${siteUrl()}/meetings/${meeting.id}`;

  const payload = {
    title: meeting.title,
    template,
    summary: meeting.summary as Record<string, string>,
    shareUrl,
  };

  try {
    if (parsed.target === "slack") {
      if (!profile?.slack_webhook_url)
        return NextResponse.json(
          { error: "no_slack", message: "Add a Slack webhook URL in Settings first." },
          { status: 400, headers: corsHeaders() },
        );
      await postToSlack(profile.slack_webhook_url, payload);
      return NextResponse.json({ ok: true }, { headers: corsHeaders() });
    }

    if (!profile?.notion_token || !profile?.notion_parent_page_id)
      return NextResponse.json(
        { error: "no_notion", message: "Add your Notion token and parent page in Settings first." },
        { status: 400, headers: corsHeaders() },
      );
    const { url } = await exportToNotion(
      { token: profile.notion_token, parentPageId: profile.notion_parent_page_id },
      payload,
    );
    return NextResponse.json({ ok: true, url }, { headers: corsHeaders() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 502, headers: corsHeaders() });
  }
}
