import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { supabaseServer } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login?next=/dashboard");

  return <AppShell email={data.user.email ?? ""}>{children}</AppShell>;
}
