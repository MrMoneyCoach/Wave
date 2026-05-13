import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import type { Meeting, Segment, Template } from "@/lib/types";
import MeetingView from "./MeetingView";

export const dynamic = "force-dynamic";

export default async function MeetingDetailPage({ params }: { params: { id: string } }) {
  const supabase = supabaseServer();

  const [{ data: meeting }, { data: segments }, { data: templates }, { data: profile }] =
    await Promise.all([
      supabase.from("meetings").select("*").eq("id", params.id).single(),
      supabase
        .from("segments")
        .select("*")
        .eq("meeting_id", params.id)
        .order("start_seconds", { ascending: true }),
      supabase
        .from("templates")
        .select("id, owner_id, slug, name, description, sections, prompt, is_premium")
        .order("is_premium", { ascending: true })
        .order("name", { ascending: true }),
      supabase.from("profiles").select("speaker_aliases").maybeSingle(),
    ]);

  if (!meeting) notFound();

  return (
    <MeetingView
      meeting={meeting as Meeting}
      segments={(segments ?? []) as Segment[]}
      templates={(templates ?? []) as Template[]}
      speakerAliases={(profile?.speaker_aliases ?? {}) as Record<string, string>}
    />
  );
}
