import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CommunityTabs from "@/components/communities/CommunityTabs";

interface HobbyRow {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  created_by: string;
  created_at: string;
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CommunityPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("hobbies")
    .select("*")
    .eq("id", id)
    .single();

  const hobby = data as HobbyRow | null;
  if (!hobby) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userRole: string | null = null;
  if (user) {
    const isCreator = hobby.created_by === user.id;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const globalRole = (profile as { role: string } | null)?.role ?? "user";

    if (isCreator || globalRole === "moderator" || globalRole === "admin") {
      userRole = "moderator";
    } else {
      userRole = "member";
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="shrink-0 border-b border-charcoal-100 pb-4 dark:border-charcoal-700">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-brand-400 text-sm font-bold text-white">
            {hobby.title.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-charcoal dark:text-white">
              {hobby.title}
            </h1>
            {hobby.description && (
              <p className="mt-0.5 text-sm text-charcoal-400 dark:text-charcoal-300">
                {hobby.description}
              </p>
            )}
          </div>
          {hobby.category && (
            <span className="ml-auto shrink-0 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand dark:bg-brand-900/30 dark:text-brand-300">
              {hobby.category}
            </span>
          )}
        </div>
        {userRole && (
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand dark:bg-brand-900/30 dark:text-brand-300">
            {userRole === "moderator" ? "Community Leader" : "Member"}
          </span>
        )}
      </div>

      <CommunityTabs
        communityId={id}
        createdBy={hobby.created_by}
        userId={user?.id ?? null}
        userRole={userRole}
      />
    </div>
  );
}
