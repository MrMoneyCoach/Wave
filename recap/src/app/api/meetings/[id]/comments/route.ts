import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { supabaseFromRequest, corsHeaders, corsPreflight } from "@/lib/supabase/auth";

const Body = z.object({ body: z.string().min(1).max(4000) });

export function OPTIONS() {
  return corsPreflight();
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { supabase, user } = await supabaseFromRequest(request);
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: corsHeaders() });

  // RLS already restricts comments to meetings the user can see.
  const { data, error } = await supabase
    .from("comments")
    .select("id, meeting_id, author_id, author_email, body, created_at")
    .eq("meeting_id", params.id)
    .order("created_at", { ascending: true });
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400, headers: corsHeaders() });
  return NextResponse.json({ comments: data ?? [] }, { headers: corsHeaders() });
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

  // The insert RLS policy enforces that the user can actually see the meeting.
  const { data, error } = await supabase
    .from("comments")
    .insert({
      meeting_id: params.id,
      author_id: user.id,
      author_email: user.email ?? "unknown",
      body: parsed.body.trim(),
    })
    .select("id, meeting_id, author_id, author_email, body, created_at")
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400, headers: corsHeaders() });
  return NextResponse.json(data, { headers: corsHeaders() });
}
