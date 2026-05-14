import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import TemplateEditor, { initialFrom } from "../../TemplateEditor";
import type { Template } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditTemplatePage({ params }: { params: { id: string } }) {
  const supabase = supabaseServer();
  const [{ data: profile }, { data: user }] = await Promise.all([
    supabase.from("profiles").select("plan").maybeSingle(),
    supabase.auth.getUser(),
  ]);
  if (profile?.plan !== "pro") redirect("/dashboard/billing?intent=custom_templates");

  const { data } = await supabase
    .from("templates")
    .select("id, owner_id, slug, name, description, sections, prompt, is_premium")
    .eq("id", params.id)
    .single();
  if (!data) notFound();
  if (data.owner_id !== user.user?.id) redirect("/dashboard/templates");

  return (
    <div>
      <h1 className="text-2xl font-semibold">Edit template</h1>
      <TemplateEditor
        mode={{ kind: "edit", id: params.id }}
        initial={initialFrom(data as Template)}
      />
    </div>
  );
}
