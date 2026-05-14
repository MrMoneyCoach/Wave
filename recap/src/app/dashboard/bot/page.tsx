import { supabaseServer } from "@/lib/supabase/server";
import BotForm from "./BotForm";
import type { Template } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BotPage() {
  const supabase = supabaseServer();
  const { data: templates } = await supabase
    .from("templates")
    .select("id, owner_id, slug, name, description, sections, prompt, is_premium")
    .order("is_premium", { ascending: true })
    .order("name", { ascending: true });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Send a meeting bot</h1>
      <p className="mt-1 text-sm text-ink/60">
        Recap will join the call as a participant, record it, then transcribe and summarise it
        in the background. Works with Zoom, Google Meet, and Microsoft Teams.
      </p>
      <BotForm templates={(templates ?? []) as Template[]} />
    </div>
  );
}
