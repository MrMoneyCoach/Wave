import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabase/server";
import { SummaryDisplay } from "@/components/SummaryDisplay";
import { formatDate, formatSeconds, speakerColor } from "@/lib/format";
import type { Meeting, Segment, Template } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Public, unauthenticated read-only view. We use the service-role client and
// gate access purely on possession of the unguessable share token.
export default async function SharedMeetingPage({ params }: { params: { token: string } }) {
  const admin = supabaseAdmin();

  const { data: meeting } = await admin
    .from("meetings")
    .select("*")
    .eq("public_share_token", params.token)
    .maybeSingle();

  if (!meeting) notFound();
  const m = meeting as Meeting;

  const [{ data: segments }, { data: template }] = await Promise.all([
    admin
      .from("segments")
      .select("*")
      .eq("meeting_id", m.id)
      .order("start_seconds", { ascending: true }),
    m.template_id
      ? admin
          .from("templates")
          .select("id, owner_id, slug, name, description, sections, prompt, is_premium")
          .eq("id", m.template_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const segs = (segments ?? []) as Segment[];
  const tpl = (template ?? null) as Template | null;
  const speakerCount = new Set(segs.map((s) => s.speaker)).size;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="text-xs uppercase tracking-widest text-ink/50">Shared via Recap</div>
      <h1 className="mt-2 text-3xl font-semibold">{m.title}</h1>
      <p className="mt-1 text-sm text-ink/60">
        {formatDate(m.created_at)} · {formatSeconds(m.duration_seconds)} · {speakerCount}{" "}
        {speakerCount === 1 ? "speaker" : "speakers"}
      </p>

      {m.summary && tpl ? (
        <section className="mt-8">
          <h2 className="text-xs font-medium uppercase tracking-widest text-ink/50">
            {tpl.name} summary
          </h2>
          <div className="mt-2">
            <SummaryDisplay sections={tpl.sections} summary={m.summary} />
          </div>
        </section>
      ) : (
        <p className="mt-8 text-sm text-ink/60">This meeting doesn&apos;t have a summary yet.</p>
      )}

      {segs.length > 0 && (
        <section className="mt-10 border-t border-ink/10 pt-8">
          <h2 className="text-xs font-medium uppercase tracking-widest text-ink/50">Transcript</h2>
          <div className="mt-3 space-y-3">
            {segs.map((s) => (
              <div key={s.id} className="flex items-start gap-3">
                <span className="w-12 shrink-0 pt-0.5 text-xs text-ink/40">
                  {formatSeconds(s.start_seconds)}
                </span>
                <div className="flex-1">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${speakerColor(s.speaker)}`}
                  >
                    Speaker {s.speaker + 1}
                  </span>
                  <p className="mt-1 text-sm leading-relaxed">{s.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <footer className="mt-12 border-t border-ink/10 pt-6 text-xs text-ink/50">
        Anyone with this link can view this page. The meeting owner can revoke access at any time.
      </footer>
    </main>
  );
}
