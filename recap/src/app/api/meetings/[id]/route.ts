import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = PatchBody.parse(await request.json());
  const { data, error } = await supabase
    .from("meetings")
    .update(body)
    .eq("id", params.id)
    .eq("owner_id", userData.user.id)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: meeting } = await supabase
    .from("meetings")
    .select("audio_path")
    .eq("id", params.id)
    .eq("owner_id", userData.user.id)
    .single();

  if (meeting?.audio_path) {
    await supabase.storage.from("recordings").remove([meeting.audio_path]);
  }
  const { error } = await supabase
    .from("meetings")
    .delete()
    .eq("id", params.id)
    .eq("owner_id", userData.user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
