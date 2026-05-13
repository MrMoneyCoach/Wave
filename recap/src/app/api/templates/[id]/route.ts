import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { supabaseFromRequest, corsHeaders, corsPreflight } from "@/lib/supabase/auth";

const SectionSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(40)
    .regex(/^[a-z0-9-]+$/i, "Section keys can only contain letters, digits, and dashes."),
  label: z.string().min(1).max(80),
});

const PatchBody = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(280).optional().nullable(),
  sections: z.array(SectionSchema).min(1).max(12).optional(),
  prompt: z.string().min(10).max(4000).optional(),
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

  let body: z.infer<typeof PatchBody>;
  try {
    body = PatchBody.parse(await request.json());
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "invalid_body" },
      { status: 400, headers: corsHeaders() },
    );
  }

  const { data, error } = await supabase
    .from("templates")
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

  const { error } = await supabase
    .from("templates")
    .delete()
    .eq("id", params.id)
    .eq("owner_id", user.id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400, headers: corsHeaders() });
  return NextResponse.json({ ok: true }, { headers: corsHeaders() });
}
