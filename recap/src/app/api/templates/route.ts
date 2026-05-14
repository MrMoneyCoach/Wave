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

const Body = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(280).optional().nullable(),
  sections: z.array(SectionSchema).min(1).max(12),
  prompt: z.string().min(10).max(4000),
});

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "template";
}

export function OPTIONS() {
  return corsPreflight();
}

/** Create a custom template. Requires plan='pro'. */
export async function POST(request: NextRequest) {
  const { supabase, user } = await supabaseFromRequest(request);
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: corsHeaders() });

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();
  if (profile?.plan !== "pro") {
    return NextResponse.json(
      { error: "plan_required", message: "Custom templates require the Pro plan." },
      { status: 402, headers: corsHeaders() },
    );
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await request.json());
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "invalid_body" },
      { status: 400, headers: corsHeaders() },
    );
  }

  // Unique-per-user slug. Append a suffix if there's a collision.
  const base = slugify(body.name);
  let slug = base;
  for (let attempt = 1; attempt < 50; attempt++) {
    const { data: existing } = await supabase
      .from("templates")
      .select("id")
      .eq("owner_id", user.id)
      .eq("slug", slug)
      .maybeSingle();
    if (!existing) break;
    slug = `${base}-${attempt + 1}`;
  }

  const { data, error } = await supabase
    .from("templates")
    .insert({
      owner_id: user.id,
      slug,
      name: body.name,
      description: body.description ?? null,
      sections: body.sections,
      prompt: body.prompt,
      is_premium: false,
    })
    .select("id, slug")
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400, headers: corsHeaders() });
  return NextResponse.json(data, { headers: corsHeaders() });
}
