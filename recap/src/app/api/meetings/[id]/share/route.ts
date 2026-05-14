import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";
import { supabaseFromRequest, corsHeaders, corsPreflight } from "@/lib/supabase/auth";

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("enable_public") }),
  z.object({ action: z.literal("disable_public") }),
  z.object({ action: z.literal("add_email"), email: z.string().email() }),
  z.object({ action: z.literal("remove_email"), share_id: z.string().uuid() }),
]);

export function OPTIONS() {
  return corsPreflight();
}

/** Returns the current share state for the meeting. */
async function shareState(
  supabase: Awaited<ReturnType<typeof supabaseFromRequest>>["supabase"],
  meetingId: string,
) {
  const [{ data: meeting }, { data: shares }] = await Promise.all([
    supabase.from("meetings").select("public_share_token").eq("id", meetingId).single(),
    supabase
      .from("meeting_shares")
      .select("id, shared_with_email, created_at")
      .eq("meeting_id", meetingId)
      .order("created_at", { ascending: true }),
  ]);
  return {
    public_share_token: meeting?.public_share_token ?? null,
    shares: shares ?? [],
  };
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { supabase, user } = await supabaseFromRequest(request);
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: corsHeaders() });

  // Confirm ownership — only the owner can change sharing.
  const { data: meeting } = await supabase
    .from("meetings")
    .select("id, owner_id")
    .eq("id", params.id)
    .eq("owner_id", user.id)
    .single();
  if (!meeting)
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: corsHeaders() });

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await request.json());
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "invalid_body" },
      { status: 400, headers: corsHeaders() },
    );
  }

  try {
    switch (body.action) {
      case "enable_public": {
        const token = crypto.randomBytes(18).toString("base64url");
        const { error } = await supabase
          .from("meetings")
          .update({ public_share_token: token })
          .eq("id", params.id)
          .eq("owner_id", user.id);
        if (error) throw new Error(error.message);
        break;
      }
      case "disable_public": {
        const { error } = await supabase
          .from("meetings")
          .update({ public_share_token: null })
          .eq("id", params.id)
          .eq("owner_id", user.id);
        if (error) throw new Error(error.message);
        break;
      }
      case "add_email": {
        if (body.email.toLowerCase() === user.email?.toLowerCase()) {
          return NextResponse.json(
            { error: "You already own this meeting." },
            { status: 400, headers: corsHeaders() },
          );
        }
        const { error } = await supabase.from("meeting_shares").insert({
          meeting_id: params.id,
          shared_with_email: body.email.toLowerCase(),
          created_by: user.id,
        });
        if (error && !/duplicate key/i.test(error.message)) throw new Error(error.message);
        break;
      }
      case "remove_email": {
        const { error } = await supabase
          .from("meeting_shares")
          .delete()
          .eq("id", body.share_id)
          .eq("meeting_id", params.id);
        if (error) throw new Error(error.message);
        break;
      }
    }
    return NextResponse.json(await shareState(supabase, params.id), { headers: corsHeaders() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500, headers: corsHeaders() });
  }
}
