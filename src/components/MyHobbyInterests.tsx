"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getDisplayName, getInitials } from "@/lib/display-name";
import { formatShortDate } from "@/lib/date-locale";

interface InterestedUser {
  id: string;
  created_at: string;
  profiles: {
    first_name?: string | null;
    last_name?: string | null;
    avatar_url: string | null;
    major: string | null;
  } | null;
}

interface HobbyWithInterests {
  id: string;
  title: string;
  category: string | null;
  interests: InterestedUser[];
}

export default function MyHobbyInterests() {
  const supabase = createClient();

  const [hobbies, setHobbies] = useState<HobbyWithInterests[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalInterests, setTotalInterests] = useState(0);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      let myHobbies: { id: string; title: string; category?: string | null }[] | null = null;

      const { data: d1, error: e1 } = await supabase
        .from("hobbies")
        .select("id, title, category")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });

      if (e1 && /column.*does not exist/i.test(e1.message)) {
        const { data: d2 } = await supabase
          .from("hobbies")
          .select("id, title")
          .eq("created_by", user.id)
          .order("created_at", { ascending: false });
        myHobbies = (d2 as typeof myHobbies) ?? [];
      } else {
        myHobbies = (d1 as typeof myHobbies) ?? [];
      }

      if (!myHobbies || myHobbies.length === 0) { setLoading(false); return; }

      const hobbyIds = myHobbies.map((h) => h.id);

      const { data: i1 } = await supabase
        .from("interests")
        .select("id, hobby_id, created_at, profiles(first_name, last_name, avatar_url, major)")
        .in("hobby_id", hobbyIds)
        .order("created_at", { ascending: false });

      const interests: (InterestedUser & { hobby_id: string })[] = (i1 ?? []) as unknown as (InterestedUser & { hobby_id: string })[];

      const interestsByHobby = new Map<string, InterestedUser[]>();
      for (const row of interests) {
        const list = interestsByHobby.get(row.hobby_id) ?? [];
        list.push({ id: row.id, created_at: row.created_at, profiles: row.profiles });
        interestsByHobby.set(row.hobby_id, list);
      }

      let total = 0;
      const result: HobbyWithInterests[] = [];
      for (const h of myHobbies) {
        const list = interestsByHobby.get(h.id) ?? [];
        total += list.length;
        result.push({ id: h.id, title: h.title, category: h.category ?? null, interests: list });
      }

      setHobbies(result);
      setTotalInterests(total);
      setLoading(false);
    }

    load();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-brand border-t-transparent" />
      </div>
    );
  }

  if (hobbies.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-charcoal-200 py-12 text-center dark:border-charcoal-600">
        <p className="text-sm text-charcoal-400 dark:text-charcoal-300">
          You haven&apos;t created any communities yet.
        </p>
        <p className="mt-1 text-xs text-charcoal-300 dark:text-charcoal-500">
          Create one from the sidebar to start receiving interest!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-charcoal-500 dark:text-charcoal-300">
          {totalInterests} interested {totalInterests === 1 ? "student" : "students"} across{" "}
          {hobbies.length} {hobbies.length === 1 ? "community" : "communities"}
        </span>
      </div>

      {hobbies.map((hobby) => (
        <div
          key={hobby.id}
          className="rounded-xl border border-charcoal-100 bg-white shadow-sm dark:border-charcoal-700 dark:bg-charcoal-800/60"
        >
          <div className="flex items-center gap-2 border-b border-charcoal-100 px-5 py-3.5 dark:border-charcoal-700">
            <h4 className="text-sm font-semibold text-charcoal dark:text-white">{hobby.title}</h4>
            {hobby.category && (
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand dark:bg-brand-900/30 dark:text-brand-300">{hobby.category}</span>
            )}
            <span className="ml-auto rounded-full bg-charcoal-50 px-2.5 py-0.5 text-[11px] font-semibold text-charcoal-500 dark:bg-charcoal-700 dark:text-charcoal-300">{hobby.interests.length}</span>
          </div>

          {hobby.interests.length === 0 ? (
            <div className="px-5 py-6 text-center">
              <p className="text-xs text-charcoal-300 dark:text-charcoal-500">No one has expressed interest yet.</p>
            </div>
          ) : (
            <ul className="divide-y divide-charcoal-50 dark:divide-charcoal-700">
              {hobby.interests.map((interest) => (
                <li key={interest.id} className="flex items-center gap-3 px-5 py-3">
                  {interest.profiles?.avatar_url ? (
                    <Image src={interest.profiles.avatar_url} alt="" width={32} height={32} className="h-8 w-8 shrink-0 rounded-full bg-brand-50 dark:bg-brand-900/30" unoptimized />
                  ) : (
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-400 text-xs font-bold text-white">{getInitials(interest.profiles)}</span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-charcoal dark:text-white">{getDisplayName(interest.profiles, "Unknown user")}</p>
                    {interest.profiles?.major && <p className="text-xs text-charcoal-400 dark:text-charcoal-400">{interest.profiles.major}</p>}
                  </div>
                  <span className="shrink-0 text-[11px] text-charcoal-300 dark:text-charcoal-500">
                    {formatShortDate(interest.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
