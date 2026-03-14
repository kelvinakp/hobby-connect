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
      <div className="shrink-0 border-b border-charcoal-100 bg-gradient-to-b from-brand-50/40 to-transparent pb-5 dark:border-charcoal-700 dark:from-brand-900/10">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-600 shadow-lg shadow-brand/25">
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-charcoal dark:text-white">
              {hobby.title}
            </h1>
            {hobby.description && (
              <p className="mt-1 text-sm leading-relaxed text-charcoal-500 dark:text-charcoal-400">
                {hobby.description}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {hobby.category && (
                <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand dark:bg-brand-900/40 dark:text-brand-300">
                  {hobby.category}
                </span>
              )}
              {userRole && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-charcoal-100 px-2.5 py-0.5 text-xs font-medium text-charcoal-600 dark:bg-charcoal-700 dark:text-charcoal-300">
                  {userRole === "moderator" ? "Community Leader" : "Member"}
                </span>
              )}
            </div>
          </div>
        </div>
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
