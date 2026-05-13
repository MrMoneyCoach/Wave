import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

const CreateBody = z.object({
  title: z.string().min(1).max(200).optional(),
  filename: z.string().min(1).max(200),
  template_id: z.string().uuid().nullable().optional(),
  source: z
    .enum(["upload", "browser_record", "desktop_app", "mobile_app", "meeting_bot"])
    .default("upload"),
});

export async function POST(request: NextRequest) {
  const supabase = supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = CreateBody.parse(await request.json());
  const safeName = body.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const audio_path = `${userData.user.id}/${crypto.randomUUID()}-${safeName}`;

  const { data, error } = await supabase
    .from("meetings")
    .insert({
      owner_id: userData.user.id,
      title: body.title ?? body.filename.replace(/\.[^.]+$/, "") ?? "Untitled meeting",
      audio_path,
      source: body.source,
      template_id: body.template_id ?? null,
      status: "uploading",
    })
    .select("id, audio_path")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
