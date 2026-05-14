import { supabaseServer } from "@/lib/supabase/server";
import SettingsForm from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = supabaseServer();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, slack_webhook_url, notion_token, notion_parent_page_id")
    .maybeSingle();

  return (
    <div>
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p className="mt-1 text-sm text-ink/60">
        Connect Slack and Notion so you can push a meeting summary out with one click from any
        meeting page.
      </p>
      <SettingsForm
        initial={{
          display_name: profile?.display_name ?? "",
          slack_webhook_url: profile?.slack_webhook_url ?? "",
          notion_token: profile?.notion_token ?? "",
          notion_parent_page_id: profile?.notion_parent_page_id ?? "",
        }}
      />
    </div>
  );
}
