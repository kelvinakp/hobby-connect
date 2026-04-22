import type { SupabaseClient } from "@supabase/supabase-js";

export interface CommunitySearchScope {
  canSearchAllCommunities: boolean;
  searchableCommunityIds: string[];
}

interface SearchScopeOptions {
  adminMode?: boolean;
}

export async function getCommunitySearchScope(
  supabase: SupabaseClient,
  options?: SearchScopeOptions
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
  if (role === "admin" && !options?.adminMode) {
    const scopeIds = new Set<string>();

    const { data: created } = await supabase
      .from("hobbies")
      .select("id")
      .eq("created_by", user.id);
    for (const row of (created ?? []) as { id: string }[]) {
      scopeIds.add(row.id);
    }

    const { data: joined } = await supabase
      .from("interests")
      .select("hobby_id")
      .eq("user_id", user.id);
    for (const row of (joined ?? []) as { hobby_id: string }[]) {
      scopeIds.add(row.hobby_id);
    }

    return {
      canSearchAllCommunities: false,
      searchableCommunityIds: Array.from(scopeIds),
    };
  }

  return {
    canSearchAllCommunities: true,
    searchableCommunityIds: [],
  };
}
