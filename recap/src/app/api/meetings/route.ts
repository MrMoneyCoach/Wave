import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { supabaseFromRequest, corsHeaders, corsPreflight } from "@/lib/supabase/auth";

const CreateBody = z.object({
  title: z.string().min(1).max(200).optional(),
  filename: z.string().min(1).max(200),
  template_id: z.string().uuid().nullable().optional(),
  source: z
    .enum(["upload", "browser_record", "desktop_app", "mobile_app", "meeting_bot"])
    .default("upload"),
});

export function OPTIONS() {
  return corsPreflight();
}

export async function POST(request: NextRequest) {
  const { supabase, user } = await supabaseFromRequest(request);
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: corsHeaders() });

  const body = CreateBody.parse(await request.json());
  const safeName = body.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const audio_path = `${user.id}/${crypto.randomUUID()}-${safeName}`;

  const { data, error } = await supabase
    .from("meetings")
    .insert({
      owner_id: user.id,
      title: body.title ?? body.filename.replace(/\.[^.]+$/, "") ?? "Untitled meeting",
      audio_path,
      source: body.source,
      template_id: body.template_id ?? null,
      status: "uploading",
    })
    .select("id, audio_path")
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 400, headers: corsHeaders() });
  return NextResponse.json(data, { headers: corsHeaders() });
}
