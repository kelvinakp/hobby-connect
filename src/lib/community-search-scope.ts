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
  // Authenticated users (including regular users) can search all communities.
  // Access to restricted tabs/details remains enforced elsewhere.
  return {
    canSearchAllCommunities: true,
    searchableCommunityIds: [],
  };
}
