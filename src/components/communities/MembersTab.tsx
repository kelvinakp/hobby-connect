"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getDisplayName, getInitials } from "@/lib/display-name";
import { formatShortDate } from "@/lib/date-locale";

interface Member {
  id: string;
  user_id: string;
  created_at: string;
  profiles: {
    first_name?: string | null;
    last_name?: string | null;
    avatar_url: string | null;
  } | null;
}

interface Props {
  communityId: string;
  createdBy: string;
  userId: string | null;
  userRole: string | null;
}

export default function MembersTab({ communityId, createdBy, userId, userRole }: Props) {
  const supabase = createClient();
  const [members, setMembers] = useState<Member[]>([]);
  const [creatorProfile, setCreatorProfile] = useState<Member["profiles"]>(null);
  const [loading, setLoading] = useState(true);
  const [adminMode, setAdminMode] = useState(true);
  const isMod =
    userRole === "moderator" ||
    (userRole === "admin" && adminMode);

  useEffect(() => {
    function updateModeFromStorage() {
      const modeValue =
        typeof window !== "undefined"
          ? window.localStorage.getItem("sidebar-admin-mode")
          : null;
      setAdminMode(modeValue !== "user");
    }

    updateModeFromStorage();
    window.addEventListener("admin-mode-changed", updateModeFromStorage);
    return () => {
      window.removeEventListener("admin-mode-changed", updateModeFromStorage);
    };
  }, []);

  useEffect(() => {
    async function load() {
      const { data: cp } = await supabase
        .from("public_profiles")
        .select("id, first_name, last_name, avatar_url")
        .eq("id", createdBy)
        .single();
      setCreatorProfile(
        cp
          ? {
              first_name: (cp as { first_name: string | null }).first_name,
              last_name: (cp as { last_name: string | null }).last_name,
              avatar_url: (cp as { avatar_url: string | null }).avatar_url,
            }
          : null
      );

      const { data, error } = await supabase
        .from("interests")
        .select("id, user_id, created_at")
        .eq("hobby_id", communityId)
        .order("created_at", { ascending: true });

      if (error) {
        console.warn("[MembersTab] Could not load members:", error.message);
      }

      const rows =
        (data as { id: string; user_id: string; created_at: string }[] | null) ?? [];
      const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
      const profileMap = new Map<string, Member["profiles"]>();
      if (userIds.length > 0) {
        const { data: pp } = await supabase
          .from("public_profiles")
          .select("id, first_name, last_name, avatar_url")
          .in("id", userIds);
        (pp as { id: string; first_name: string | null; last_name: string | null; avatar_url: string | null }[] | null)?.forEach(
          (p) => {
            profileMap.set(p.id, {
              first_name: p.first_name,
              last_name: p.last_name,
              avatar_url: p.avatar_url,
            });
          }
        );
      }
      setMembers(
        rows.map((r) => ({
          ...r,
          profiles: profileMap.get(r.user_id) ?? null,
        }))
      );
      setLoading(false);
    }
    load();
  }, [communityId, createdBy, supabase]);

  async function handleRemoveMember(interestId: string) {
    if (!confirm("Remove this member from the community?")) return;
    const { error } = await supabase.from("interests").delete().eq("id", interestId);
    if (!error) {
      setMembers((prev) => prev.filter((m) => m.id !== interestId));
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  const totalCount = members.length + 1;

  return (
    <div className="flex flex-1 flex-col rounded-xl border border-charcoal-100 bg-white dark:border-charcoal-700 dark:bg-charcoal-800/50">
      <div className="flex items-center justify-between border-b border-charcoal-100 p-4 dark:border-charcoal-700">
        <h3 className="text-sm font-semibold text-charcoal dark:text-white">
          Members
        </h3>
        <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold text-brand dark:bg-brand-900/30 dark:text-brand-300">
          {totalCount}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Creator card */}
        <div className="mb-4 rounded-2xl border border-l-4 border-l-brand border-charcoal-100 bg-gradient-to-r from-brand-50/50 to-transparent p-4 dark:border-charcoal-700 dark:from-brand-900/10 dark:border-l-brand">
          <div className="flex items-center gap-3">
            {creatorProfile?.avatar_url ? (
              <Image src={creatorProfile.avatar_url} alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-full bg-brand-50 dark:bg-brand-900/30" unoptimized />
            ) : (
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-500 text-sm font-bold text-white shadow-md shadow-brand/20">
                {getInitials(creatorProfile)}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-charcoal dark:text-white">{getDisplayName(creatorProfile, "Unknown")}</p>
                <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                  Creator
                </span>
                {createdBy === userId && (
                  <span className="rounded-full bg-charcoal-100 px-2 py-0.5 text-[10px] font-medium text-charcoal-500 dark:bg-charcoal-600 dark:text-charcoal-300">You</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Joined members */}
        {members.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-charcoal-200 py-12 text-center dark:border-charcoal-600">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-charcoal-50 dark:bg-charcoal-700">
              <svg className="h-6 w-6 text-charcoal-300 dark:text-charcoal-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-charcoal-400 dark:text-charcoal-300">No other members yet</p>
            <p className="mt-1 text-xs text-charcoal-300 dark:text-charcoal-500">
              Students can join from the hobby feed.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-charcoal-400 dark:text-charcoal-500">Members</p>
            {members.map((m) => {
              const isYou = m.user_id === userId;
              return (
                <div
                  key={m.id}
                  className="group flex items-center gap-3 rounded-xl border border-charcoal-100 bg-white px-4 py-3 transition-shadow hover:shadow-sm dark:border-charcoal-700 dark:bg-charcoal-800/40"
                >
                  {m.profiles?.avatar_url ? (
                    <Image src={m.profiles.avatar_url} alt="" width={36} height={36} className="h-9 w-9 shrink-0 rounded-full bg-brand-50 dark:bg-brand-900/30" unoptimized />
                  ) : (
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-400 text-xs font-bold text-white">
                      {getInitials(m.profiles)}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-charcoal dark:text-white">{getDisplayName(m.profiles, "Unknown")}</p>
                      <span className="rounded-full bg-charcoal-50 px-2 py-0.5 text-[10px] font-medium text-charcoal-500 dark:bg-charcoal-600 dark:text-charcoal-300">
                        Member
                      </span>
                      {isYou && (
                        <span className="rounded-full bg-charcoal-100 px-2 py-0.5 text-[10px] font-medium text-charcoal-500 dark:bg-charcoal-600 dark:text-charcoal-300">You</span>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 text-[11px] text-charcoal-400 dark:text-charcoal-500">
                    Joined {formatShortDate(m.created_at)}
                  </span>
                  {isMod && !isYou && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(m.id)}
                      className="shrink-0 rounded-md p-1.5 text-red-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-900/30"
                      title="Remove member"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM4 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 10.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
