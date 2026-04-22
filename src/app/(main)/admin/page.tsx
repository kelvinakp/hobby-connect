import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import AdminDashboard from "@/components/AdminDashboard";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = (profile as { role?: string } | null)?.role ?? "user";
  if (role !== "admin") {
    redirect("/");
  }

  const cookieStore = await cookies();
  const mode = cookieStore.get("sidebar-admin-mode")?.value ?? "user";
  if (mode !== "admin") {
    redirect("/");
  }

  return (
    <div className="py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-charcoal dark:text-white">
            Admin Dashboard
          </h1>
          <p className="mt-1 text-sm text-charcoal-400 dark:text-charcoal-300">
            Manage users, review submitted posts, and remove inappropriate chat messages and events.
          </p>
        </div>
        <AdminDashboard />
      </div>
    </div>
  );
}
