import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { supabaseFromRequest, corsHeaders, corsPreflight } from "@/lib/supabase/auth";

const PatchBody = z.object({
  title: z.string().min(1).max(200).optional(),
  template_id: z.string().uuid().nullable().optional(),
  status: z
    .enum([
      "uploading",
      "queued",
      "transcribing",
      "transcribed",
      "summarizing",
      "ready",
      "failed",
    ])
    .optional(),
});

export function OPTIONS() {
  return corsPreflight();
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { supabase, user } = await supabaseFromRequest(request);
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: corsHeaders() });

  const body = PatchBody.parse(await request.json());
  const { data, error } = await supabase
    .from("meetings")
    .update(body)
    .eq("id", params.id)
    .eq("owner_id", user.id)
    .select("*")
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400, headers: corsHeaders() });
  return NextResponse.json(data, { headers: corsHeaders() });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { supabase, user } = await supabaseFromRequest(request);
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: corsHeaders() });

  const { data: meeting } = await supabase
    .from("meetings")
    .select("audio_path")
    .eq("id", params.id)
    .eq("owner_id", user.id)
    .single();

  if (meeting?.audio_path) {
    await supabase.storage.from("recordings").remove([meeting.audio_path]);
  }
  const { error } = await supabase
    .from("meetings")
    .delete()
    .eq("id", params.id)
    .eq("owner_id", user.id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400, headers: corsHeaders() });
  return NextResponse.json({ ok: true }, { headers: corsHeaders() });
}
