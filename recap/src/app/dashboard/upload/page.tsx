import { supabaseServer } from "@/lib/supabase/server";
import UploadForm from "./UploadForm";
import type { Template } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  const supabase = supabaseServer();
  const { data: templates } = await supabase
    .from("templates")
    .select("id, owner_id, slug, name, description, sections, prompt, is_premium")
    .order("is_premium", { ascending: true })
    .order("name", { ascending: true });

  return (
    <div>
      <h1 className="text-2xl font-semibold">New meeting</h1>
      <p className="mt-1 text-sm text-ink/60">
        Upload an audio or video file. We accept mp3, m4a, wav, mp4 and a few others — up to 200&nbsp;MB.
      </p>
      <UploadForm templates={(templates ?? []) as Template[]} />
    </div>
  );
}
