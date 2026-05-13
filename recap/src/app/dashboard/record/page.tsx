import { supabaseServer } from "@/lib/supabase/server";
import RecorderClient from "./RecorderClient";
import type { Template } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function RecordPage() {
  const supabase = supabaseServer();
  const { data: templates } = await supabase
    .from("templates")
    .select("id, owner_id, slug, name, description, sections, prompt, is_premium")
    .order("is_premium", { ascending: true })
    .order("name", { ascending: true });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Record a meeting</h1>
      <p className="mt-1 text-sm text-ink/60">
        Captures both sides of a video call by mixing your microphone with the tab/screen audio.
        Works best in Chrome, Edge, or Arc on macOS &amp; Windows.
      </p>
      <RecorderClient templates={(templates ?? []) as Template[]} />
    </div>
  );
}
