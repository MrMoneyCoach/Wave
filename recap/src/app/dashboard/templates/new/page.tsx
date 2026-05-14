import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import TemplateEditor, { emptyInitial, initialFrom } from "../TemplateEditor";
import type { Template } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NewTemplatePage({
  searchParams,
}: {
  searchParams: { from?: string };
}) {
  const supabase = supabaseServer();
  const { data: profile } = await supabase.from("profiles").select("plan").maybeSingle();
  if (profile?.plan !== "pro") redirect("/dashboard/billing?intent=custom_templates");

  let initial = emptyInitial();
  if (searchParams.from) {
    const { data } = await supabase
      .from("templates")
      .select("id, owner_id, slug, name, description, sections, prompt, is_premium")
      .eq("id", searchParams.from)
      .single();
    if (data) {
      const tpl = data as Template;
      initial = {
        ...initialFrom(tpl),
        name: `${tpl.name} (copy)`,
      };
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">New custom template</h1>
      <p className="mt-1 text-sm text-ink/60">
        Define your own sections and prompt. Available immediately on every meeting&apos;s
        template picker.
      </p>
      <TemplateEditor mode={{ kind: "new" }} initial={initial} />
    </div>
  );
}
