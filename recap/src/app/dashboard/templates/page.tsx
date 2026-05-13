import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import type { Template } from "@/lib/types";
import TemplatesList from "./TemplatesList";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const supabase = supabaseServer();

  const [{ data: templates }, { data: profile }, { data: user }] = await Promise.all([
    supabase
      .from("templates")
      .select("id, owner_id, slug, name, description, sections, prompt, is_premium")
      .order("owner_id", { ascending: true, nullsFirst: true })
      .order("name", { ascending: true }),
    supabase.from("profiles").select("plan").maybeSingle(),
    supabase.auth.getUser(),
  ]);

  const list = (templates ?? []) as Template[];
  const isPro = profile?.plan === "pro";
  const userId = user.user?.id ?? null;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Templates</h1>
          <p className="mt-1 text-sm text-ink/60">
            Templates shape the summary your team reads. Free plan includes 8 built-ins.
            Pro adds custom templates with your own sections + prompt.
          </p>
        </div>
        <Link
          href={isPro ? "/dashboard/templates/new" : "/dashboard/billing"}
          className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper hover:opacity-90"
        >
          {isPro ? "New custom template" : "Upgrade to add custom templates"}
        </Link>
      </div>

      <TemplatesList templates={list} userId={userId} isPro={isPro} />
    </div>
  );
}
