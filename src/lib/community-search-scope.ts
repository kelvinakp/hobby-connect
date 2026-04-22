import type { SupabaseClient } from "@supabase/supabase-js";

export interface CommunitySearchScope {
  canSearchAllCommunities: boolean;
  searchableCommunityIds: string[];
}

export async function getCommunitySearchScope(
  supabase: SupabaseClient
): Promise<CommunitySearchScope> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      canSearchAllCommunities: false,
      searchableCommunityIds: [],
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const role = (profile as { role?: string } | null)?.role ?? "user";
  const privileged = role === "admin" || role === "moderator";

  if (privileged) {
    return {
      canSearchAllCommunities: true,
      searchableCommunityIds: [],
    };
  }

  const [{ data: created }, { data: joined }] = await Promise.all([
    supabase.from("hobbies").select("id").eq("created_by", user.id),
    supabase.from("interests").select("hobby_id").eq("user_id", user.id),
  ]);

  const ids = new Set<string>();
  for (const row of (created ?? []) as { id: string }[]) ids.add(row.id);
  for (const row of (joined ?? []) as { hobby_id: string }[]) ids.add(row.hobby_id);

  return {
    canSearchAllCommunities: false,
    searchableCommunityIds: Array.from(ids),
  };
}
