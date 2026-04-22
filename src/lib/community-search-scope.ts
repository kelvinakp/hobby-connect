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

  return {
    canSearchAllCommunities: true,
    searchableCommunityIds: [],
  };
}
