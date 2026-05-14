import { NextResponse, type NextRequest } from "next/server";
import { supabaseFromRequest, corsHeaders, corsPreflight } from "@/lib/supabase/auth";

export function OPTIONS() {
  return corsPreflight();
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; commentId: string } },
) {
  const { supabase, user } = await supabaseFromRequest(request);
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: corsHeaders() });

  // RLS "comments: delete own" restricts this to the comment's author.
  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", params.commentId)
    .eq("meeting_id", params.id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400, headers: corsHeaders() });
  return NextResponse.json({ ok: true }, { headers: corsHeaders() });
}
