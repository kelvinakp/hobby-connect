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
    major: string | null;
    role?: string;
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
  const isMod = userRole === "moderator" || userRole === "admin";

  useEffect(() => {
    async function load() {
      const { data: cp } = await supabase
        .from("profiles")
        .select("first_name, last_name, avatar_url, major, role")
        .eq("id", createdBy)
        .single();
      setCreatorProfile(cp as Member["profiles"]);

      const { data, error } = await supabase
        .from("interests")
        .select("id, user_id, created_at, profiles(first_name, last_name, avatar_url, major, role)")
        .eq("hobby_id", communityId)
        .order("created_at", { ascending: true });

      if (error) {
        console.warn("[MembersTab] Could not load members:", error.message);
      }

      setMembers((data as unknown as Member[]) ?? []);
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
        <span className="rounded-full bg-charcoal-50 px-2.5 py-0.5 text-[11px] font-semibold text-charcoal-500 dark:bg-charcoal-700 dark:text-charcoal-300">
          {totalCount}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Creator */}
        <div className="flex items-center gap-3 border-b border-charcoal-50 px-5 py-3.5 dark:border-charcoal-700/50">
          {creatorProfile?.avatar_url ? (
            <Image src={creatorProfile.avatar_url} alt="" width={36} height={36} className="h-9 w-9 shrink-0 rounded-full bg-brand-50 dark:bg-brand-900/30" unoptimized />
          ) : (
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-400 text-xs font-bold text-white">
              {getInitials(creatorProfile)}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-charcoal dark:text-white">{getDisplayName(creatorProfile, "Unknown")}</p>
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                Owner
              </span>
            </div>
            {creatorProfile?.major && (
              <p className="text-xs text-charcoal-400 dark:text-charcoal-500">{creatorProfile.major}</p>
            )}
          </div>
          {createdBy === userId && (
            <span className="text-[10px] font-medium text-charcoal-300 dark:text-charcoal-500">You</span>
          )}
        </div>

        {/* Joined members */}
        {members.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-charcoal-50 dark:bg-charcoal-700">
              <svg className="h-6 w-6 text-charcoal-300 dark:text-charcoal-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-charcoal-400 dark:text-charcoal-300">No members yet</p>
            <p className="mt-1 text-xs text-charcoal-300 dark:text-charcoal-500">
              Students can join from the hobby feed.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-charcoal-50 dark:divide-charcoal-700/50">
            {members.map((m) => {
              const isYou = m.user_id === userId;
              return (
                <li key={m.id} className="group flex items-center gap-3 px-5 py-3">
                  {m.profiles?.avatar_url ? (
                    <Image src={m.profiles.avatar_url} alt="" width={36} height={36} className="h-9 w-9 shrink-0 rounded-full bg-brand-50 dark:bg-brand-900/30" unoptimized />
                  ) : (
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-400 text-xs font-bold text-white">
                      {getInitials(m.profiles)}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-charcoal dark:text-white">{getDisplayName(m.profiles, "Unknown")}</p>
                      {isYou && (
                        <span className="text-[10px] font-medium text-charcoal-300 dark:text-charcoal-500">You</span>
                      )}
                    </div>
                    {m.profiles?.major && (
                      <p className="text-xs text-charcoal-400 dark:text-charcoal-500">{m.profiles.major}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-[11px] text-charcoal-300 dark:text-charcoal-500">
                    {formatShortDate(m.created_at)}
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
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
