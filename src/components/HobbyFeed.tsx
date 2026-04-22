"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Skill } from "@/lib/profile-data";
import { SKILL_LEVEL_COLORS } from "@/lib/profile-data";
import { getDisplayName, getInitials } from "@/lib/display-name";
import { formatDate } from "@/lib/date-locale";
import { getCommunitySearchScope } from "@/lib/community-search-scope";
import { useSearch } from "@/components/SearchContext";

type ProfileSnippet = {
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  id?: string;
};

type CreatorExtras = {
  skills: Skill[];
  hobbies: string[];
};

type HobbyWithProfile = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  created_by: string;
  created_at: string;
  profiles: ProfileSnippet | null;
};

export default function HobbyFeed() {
  const supabase = createClient();
  const { query: searchQuery, category: selectedCategory, setCategory, clear, ALL_TAG } = useSearch();

  const [hobbies, setHobbies] = useState<HobbyWithProfile[]>([]);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [filtering, setFiltering] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [canSearchAllCommunities, setCanSearchAllCommunities] = useState(false);
  const [searchableCommunityIds, setSearchableCommunityIds] = useState<string[]>(
    []
  );

  const fetchHobbies = useCallback(
    async (search: string, cat: string) => {
      setFiltering(true);

      async function attempt(applyCat: boolean) {
        const searchTerm = search.trim();
        if (
          searchTerm &&
          !canSearchAllCommunities &&
          searchableCommunityIds.length === 0
        ) {
          return { data: [], error: null };
        }

        let q = supabase
          .from("hobbies")
          .select("id, title, description, category, created_by, created_at")
          .order("created_at", { ascending: false });

        if (!canSearchAllCommunities) {
          if (searchableCommunityIds.length === 0) {
            return { data: [], error: null };
          }
          q = q.in("id", searchableCommunityIds);
        }

        if (searchTerm) {
          const pattern = `%${searchTerm}%`;
          q = q.or(`title.ilike.${pattern},description.ilike.${pattern}`);
        }

        if (applyCat && cat !== ALL_TAG) {
          q = q.eq("category", cat);
        }

        return q;
      }

      let { data, error } = await attempt(true);

      if (error?.message?.includes("does not exist")) {
        const hasCatError = error.message.includes("category");
        const applyCat = !hasCatError;
        ({ data, error } = await attempt(applyCat));
        if (error?.message?.includes("does not exist")) {
          ({ data, error } = await attempt(false));
        }
      }

      if (error) {
        console.error("[HobbyFeed] Failed to fetch hobbies:", error.message);
      }
      const baseList =
        (data as unknown as Omit<HobbyWithProfile, "profiles">[]) ?? [];
      let list: HobbyWithProfile[] = baseList.map((h) => ({ ...h, profiles: null }));
      if (baseList.length > 0) {
        const creatorIds = Array.from(new Set(baseList.map((h) => h.created_by)));
        const { data: pp } = await supabase
          .from("public_profiles")
          .select("id, first_name, last_name, avatar_url")
          .in("id", creatorIds);
        const profileMap = new Map<string, ProfileSnippet>();
        (pp as { id: string; first_name: string | null; last_name: string | null; avatar_url: string | null }[] | null)?.forEach(
          (p) => {
            profileMap.set(p.id, {
              id: p.id,
              first_name: p.first_name,
              last_name: p.last_name,
              avatar_url: p.avatar_url,
            });
          }
        );
        list = baseList.map((h) => ({
          ...h,
          profiles: profileMap.get(h.created_by) ?? null,
        }));
      }
      setHobbies(list);

      if (list.length > 0) {
        const ids = list.map((h) => h.id);
        const counts: Record<string, number> = {};
        ids.forEach((id) => (counts[id] = 0));
        const { data: countRows, error: countError } = await supabase.rpc(
          "get_interest_counts",
          { hobby_ids: ids }
        );
        if (countError) {
          console.warn("[HobbyFeed] Could not load member counts:", countError.message);
        } else {
          (countRows as { hobby_id: string; member_count: number }[] | null)?.forEach((row) => {
            counts[row.hobby_id] = row.member_count ?? 0;
          });
        }
        setMemberCounts(counts);
      } else {
        setMemberCounts({});
      }

      setFiltering(false);
      setLoading(false);
    },
    [supabase, ALL_TAG, canSearchAllCommunities, searchableCommunityIds]
  );

  /* ── Initial load: auth + interests + hobbies ── */
  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);

      const adminMode =
        typeof window !== "undefined" &&
        window.localStorage.getItem("sidebar-admin-mode") === "admin";
      const scope = await getCommunitySearchScope(supabase, { adminMode });
      setCanSearchAllCommunities(scope.canSearchAllCommunities);
      setSearchableCommunityIds(scope.searchableCommunityIds);

      if (user) {
        const { data: interests } = await supabase
          .from("interests")
          .select("hobby_id")
          .eq("user_id", user.id);
        if (interests) {
          setJoinedIds(
            new Set((interests as { hobby_id: string }[]).map((i) => i.hobby_id))
          );
        }
      }

      await fetchHobbies("", ALL_TAG);
    }

    init();
  }, [supabase, fetchHobbies]);

  useEffect(() => {
    function onModeChanged() {
      void (async () => {
        const adminMode =
          typeof window !== "undefined" &&
          window.localStorage.getItem("sidebar-admin-mode") === "admin";
        const scope = await getCommunitySearchScope(supabase, { adminMode });
        setCanSearchAllCommunities(scope.canSearchAllCommunities);
        setSearchableCommunityIds(scope.searchableCommunityIds);
        await fetchHobbies(searchQuery, selectedCategory);
      })();
    }

    window.addEventListener("admin-mode-changed", onModeChanged);
    return () => {
      window.removeEventListener("admin-mode-changed", onModeChanged);
    };
  }, [supabase, fetchHobbies, searchQuery, selectedCategory]);

  /* ── Re-fetch when filters change (debounced for search) ── */
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (loading) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      fetchHobbies(searchQuery, selectedCategory);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, selectedCategory, fetchHobbies, loading]);

  /* ── Join / Leave hobby ── */
  async function handleToggleInterest(hobbyId: string, joined: boolean) {
    if (!userId) return;

    setJoiningId(hobbyId);

    if (joined) {
      const { error } = await supabase
        .from("interests")
        .delete()
        .eq("hobby_id", hobbyId)
        .eq("user_id", userId);
      if (!error) {
        setJoinedIds((prev) => {
          const next = new Set(prev);
          next.delete(hobbyId);
          return next;
        });
        setMemberCounts((prev) => ({
          ...prev,
          [hobbyId]: Math.max(0, (prev[hobbyId] ?? 0) - 1),
        }));
      } else {
        console.error("[HobbyFeed] Leave failed:", error.message);
      }
    } else {
      const { error } = await supabase
        .from("interests")
        .insert({ hobby_id: hobbyId, user_id: userId });

      if (!error) {
        setJoinedIds((prev) => new Set(prev).add(hobbyId));
        setMemberCounts((prev) => ({
          ...prev,
          [hobbyId]: (prev[hobbyId] ?? 0) + 1,
        }));
      } else if (error.code === "23505") {
        setJoinedIds((prev) => new Set(prev).add(hobbyId));
      } else {
        console.error("[HobbyFeed] Join failed:", error.message);
      }
    }

    setJoiningId(null);
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-charcoal-100 bg-white p-6 dark:border-charcoal-700 dark:bg-charcoal-800/40"
            >
              <div className="flex gap-3">
                <div className="h-10 w-16 shrink-0 animate-pulse rounded-lg bg-charcoal-100 dark:bg-charcoal-700" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-charcoal-100 dark:bg-charcoal-700" />
                  <div className="h-3 w-full animate-pulse rounded bg-charcoal-100 dark:bg-charcoal-700" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-charcoal-100 dark:bg-charcoal-700" />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <div className="h-6 w-20 animate-pulse rounded-full bg-charcoal-100 dark:bg-charcoal-700" />
                <div className="h-6 w-16 animate-pulse rounded-full bg-charcoal-100 dark:bg-charcoal-700" />
              </div>
            </div>
          ))}
        </div>
      ) : (() => {
        const visibleHobbies = hobbies;
        if (visibleHobbies.length === 0) {
          return (
            <NoResults
              hasFilters={searchQuery.trim() !== "" || selectedCategory !== ALL_TAG}
              onClearFilters={() => {
                setCategory(ALL_TAG);
                clear();
              }}
            />
          );
        }
        return (
          <div className="space-y-4">
            {visibleHobbies.map((hobby) => (
              <HobbyCard
                key={hobby.id}
                hobby={hobby}
                memberCount={memberCounts[hobby.id] ?? 0}
                userId={userId}
                joined={joinedIds.has(hobby.id)}
                joining={joiningId === hobby.id}
                onToggleInterest={handleToggleInterest}
              />
            ))}
          </div>
        );
      })()}
    </div>
  );
}

/* ─── Hobby card ─── */

function HobbyCard({
  hobby,
  memberCount,
  userId,
  joined,
  joining,
  onToggleInterest,
}: {
  hobby: HobbyWithProfile;
  memberCount: number;
  userId: string | null;
  joined: boolean;
  joining: boolean;
  onToggleInterest: (id: string, joined: boolean) => void;
}) {
  const [showCreator, setShowCreator] = useState(false);
  const [extras, setExtras] = useState<CreatorExtras | null>(null);
  const [loadingExtras, setLoadingExtras] = useState(false);
  const isOwner = userId === hobby.created_by;

  async function toggleCreator() {
    if (showCreator) {
      setShowCreator(false);
      return;
    }

    setShowCreator(true);

    if (extras) return;

    setLoadingExtras(true);
    const supabase = createClient();
    const [skillsRes, hobbiesRes] = await Promise.all([
      supabase.from("user_skills").select("category, skill_level").eq("user_id", hobby.created_by),
      supabase.from("profile_hobbies").select("hobby_name").eq("user_id", hobby.created_by),
    ]);
    const skillRows = (skillsRes.data as { category: string; skill_level: string }[] | null) ?? [];
    const hobbyRows = (hobbiesRes.data as { hobby_name: string }[] | null) ?? [];
    setExtras({
      skills: skillRows.map((r) => ({ name: r.category, level: r.skill_level === "pro" ? "Pro" : r.skill_level === "skilled" ? "Skilled" : "Noob" })),
      hobbies: hobbyRows.map((r) => r.hobby_name),
    });
    setLoadingExtras(false);
  }

  return (
    <div className="group rounded-2xl border border-l-4 border-l-brand border-charcoal-100 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-charcoal-700 dark:border-l-brand dark:bg-charcoal-800/60 dark:backdrop-blur-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-charcoal dark:text-white">
              {hobby.title}
            </h3>
            {hobby.category && (
              <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-medium text-brand dark:bg-brand-900/30 dark:text-brand-300">
                {hobby.category}
              </span>
            )}
            {memberCount > 0 && (
              <span className="shrink-0 text-xs text-charcoal-400 dark:text-charcoal-500">
                {memberCount} {memberCount === 1 ? "person" : "people"} interested
              </span>
            )}
          </div>
          {hobby.description && (
            <p className="mt-1.5 text-sm leading-relaxed text-charcoal-400 dark:text-charcoal-300">
              {hobby.description}
            </p>
          )}
        </div>

        {userId && !isOwner && (
          <button
            type="button"
            disabled={joining}
            onClick={() => onToggleInterest(hobby.id, joined)}
            className={`shrink-0 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
              joined
                ? "border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/40"
                : "bg-brand text-white shadow-md shadow-brand/25 hover:bg-brand-600 disabled:opacity-50"
            }`}
          >
            {joining ? (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : joined ? (
              <span className="flex items-center gap-1">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
                Leave
              </span>
            ) : (
              "I'm Interested"
            )}
          </button>
        )}

        {isOwner && (
          <span className="shrink-0 rounded-lg border border-charcoal-100 px-3 py-2 text-xs font-medium text-charcoal-400 dark:border-charcoal-600 dark:text-charcoal-500">
            Your community
          </span>
        )}
      </div>

      {/* Creator info row */}
      <div className="mt-3 flex items-center gap-2 text-xs text-charcoal-300 dark:text-charcoal-500">
        {hobby.profiles && (() => {
          const p = hobby.profiles;
          const name = getDisplayName(p, "Unknown");
          const init = getInitials(p);

          return (
            <>
              {p.avatar_url ? (
                <Image
                  src={p.avatar_url}
                  alt=""
                  width={22}
                  height={22}
                  className="h-[22px] w-[22px] rounded-full bg-brand-50 dark:bg-brand-900/30"
                  unoptimized
                />
              ) : (
                <span className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full bg-brand-50 text-[10px] font-semibold text-brand dark:bg-brand-900/30 dark:text-brand-300">
                  {init}
                </span>
              )}
              <button
                type="button"
                onClick={toggleCreator}
                className="cursor-pointer font-medium text-charcoal-500 underline decoration-dotted underline-offset-2 hover:text-brand dark:text-charcoal-300 dark:hover:text-brand-300"
              >
                {name}
              </button>
              <span aria-hidden="true">&middot;</span>
            </>
          );
        })()}
        <span>
          {formatDate(hobby.created_at)}
        </span>
      </div>

      {/* Expanded creator profile (lazily loaded) */}
      {showCreator && (
        <div className="mt-3 rounded-lg border border-charcoal-100 bg-charcoal-50/50 p-3 dark:border-charcoal-700 dark:bg-charcoal-800/40">
          {loadingExtras ? (
            <div className="flex items-center justify-center py-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
            </div>
          ) : extras && (extras.skills.length > 0 || extras.hobbies.length > 0) ? (
            <>
              {extras.skills.length > 0 && (
                <div className="mb-2">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-charcoal-400 dark:text-charcoal-500">Skills</p>
                  <div className="flex flex-wrap gap-1">
                    {extras.skills.map((s) => (
                      <span key={s.name} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${SKILL_LEVEL_COLORS[s.level]}`}>
                        {s.name} <span className="opacity-50">·</span> {s.level}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {extras.hobbies.length > 0 && (
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-charcoal-400 dark:text-charcoal-500">Hobbies</p>
                  <div className="flex flex-wrap gap-1">
                    {extras.hobbies.map((h) => (
                      <span key={h} className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">{h}</span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-center text-xs text-charcoal-400 dark:text-charcoal-500">No skills or hobbies added yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Empty state ─── */

function NoResults({
  hasFilters,
  onClearFilters,
}: {
  hasFilters: boolean;
  onClearFilters: () => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-charcoal-200 bg-charcoal-50/30 py-16 text-center dark:border-charcoal-600 dark:bg-charcoal-800/30">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-900/30">
        <svg
          className="h-7 w-7 text-brand"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          {hasFilters ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          )}
        </svg>
      </div>
      <p className="text-sm font-medium text-charcoal-600 dark:text-charcoal-300">
        {hasFilters ? "No communities match your search" : "No communities yet"}
      </p>
      <p className="mt-1 text-xs text-charcoal-400 dark:text-charcoal-500">
        {hasFilters
          ? "Try a different keyword or category."
          : "Be the first to create one! Open the menu (☰) and click Create community."}
      </p>
      {hasFilters && (
        <button
          type="button"
          onClick={onClearFilters}
          className="mt-4 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-md shadow-brand/25 transition-all hover:bg-brand-600"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
