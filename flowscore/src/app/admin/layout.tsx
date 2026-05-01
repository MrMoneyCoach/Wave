import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import AdminRail from "@/components/AdminRail";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.isAdmin) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen flex-col md:flex-row">
        <AdminRail userName={user.name ?? ""} userEmail={user.email} />
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="flex-1 px-4 py-6 md:px-8 md:py-10">{children}</main>
        </div>
      </div>
    </div>
  );
}
