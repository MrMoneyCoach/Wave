import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import type { Comment, Meeting, MeetingShare, Segment, Template } from "@/lib/types";
import MeetingView from "./MeetingView";

export const dynamic = "force-dynamic";

export default async function MeetingDetailPage({ params }: { params: { id: string } }) {
  const supabase = supabaseServer();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/login?next=/meetings/${params.id}`);
  const currentUser = userData.user;

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
      supabase
        .from("profiles")
        .select("speaker_aliases, slack_webhook_url, notion_token, notion_parent_page_id")
        .eq("id", currentUser.id)
        .maybeSingle(),
    ]);

  if (!meeting) notFound();
  const m = meeting as Meeting;
  const isOwner = m.owner_id === currentUser.id;

  // Sharing data + comments. RLS keeps non-owners from seeing other people's
  // shares; comments are visible to everyone with meeting access.
  const [{ data: shares }, { data: comments }] = await Promise.all([
    isOwner
      ? supabase
          .from("meeting_shares")
          .select("id, meeting_id, shared_with_email, created_at")
          .eq("meeting_id", params.id)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] as MeetingShare[] }),
    supabase
      .from("comments")
      .select("id, meeting_id, author_id, author_email, body, created_at")
      .eq("meeting_id", params.id)
      .order("created_at", { ascending: true }),
  ]);

  return (
    <MeetingView
      meeting={m}
      segments={(segments ?? []) as Segment[]}
      templates={(templates ?? []) as Template[]}
      speakerAliases={
        (profile?.speaker_aliases ?? {}) as Record<string, string>
      }
      isOwner={isOwner}
      currentUserId={currentUser.id}
      shares={(shares ?? []) as MeetingShare[]}
      comments={(comments ?? []) as Comment[]}
      integrations={{
        slack: !!profile?.slack_webhook_url,
        notion: !!(profile?.notion_token && profile?.notion_parent_page_id),
      }}
    />
  );
}
