"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  communityId: string;
  userId: string | null;
  initialJoined: boolean;
  isPrivileged: boolean;
}

export default function CommunityMembershipButton({
  communityId,
  userId,
  initialJoined,
  isPrivileged,
}: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [joined, setJoined] = useState(initialJoined);
  const [loading, setLoading] = useState(false);

  if (!userId || isPrivileged) return null;

  async function handleToggle() {
    if (!userId) return;
    if (joined && !confirm("Leave this community?")) return;

    setLoading(true);
    if (joined) {
      const { error } = await supabase
        .from("interests")
        .delete()
        .eq("hobby_id", communityId)
        .eq("user_id", userId);
      if (!error) {
        setJoined(false);
        router.refresh();
      }
    } else {
      const { error } = await supabase
        .from("interests")
        .insert({ hobby_id: communityId, user_id: userId });
      if (!error || error.code === "23505") {
        setJoined(true);
        router.refresh();
      }
    }
    setLoading(false);
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
        joined
          ? "border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/40"
          : "bg-brand text-white shadow-md shadow-brand/25 hover:bg-brand-600"
      } disabled:opacity-50`}
    >
      {loading ? "Please wait..." : joined ? "Leave Community" : "Join Community"}
    </button>
  );
}
