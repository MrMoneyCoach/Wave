import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { supabaseServer } from "@/lib/supabase/server";

export default async function MeetingsLayout({ children }: { children: React.ReactNode }) {
  const supabase = supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return <AppShell email={data.user.email ?? ""}>{children}</AppShell>;
}
