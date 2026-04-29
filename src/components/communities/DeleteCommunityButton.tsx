"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface DeleteCommunityButtonProps {
  communityId: string;
  communityTitle: string;
  canDelete: boolean;
}

export default function DeleteCommunityButton({
  communityId,
  communityTitle,
  canDelete,
}: DeleteCommunityButtonProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  if (!canDelete) return null;

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete "${communityTitle}"?\n\nThis will permanently remove the community and related data.`
    );
    if (!confirmed) return;

    setDeleting(true);
    setError("");

    try {
      const supabase = createClient();

      // Cleanup related rows first in case FK constraints are present.
      const cleanupResults = await Promise.all([
        supabase.from("messages").delete().eq("community_id", communityId),
        supabase.from("events").delete().eq("community_id", communityId),
        supabase.from("posts").delete().eq("community_id", communityId),
        supabase.from("interests").delete().eq("hobby_id", communityId),
      ]);

      for (const result of cleanupResults) {
        if (result.error) {
          setError(result.error.message);
          return;
        }
      }

      const { data: deletedRows, error: deleteError } = await supabase
        .from("hobbies")
        .delete()
        .eq("id", communityId)
        .select("id");

      if (deleteError) {
        setError(deleteError.message);
        return;
      }

      if (!deletedRows || deletedRows.length === 0) {
        setError("Could not delete this community (permission denied or already removed).");
        return;
      }

      window.dispatchEvent(new CustomEvent("community-membership-changed"));
      window.location.assign("/?communityDeleted=1");
    } catch {
      setError("Could not delete the community. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-800/70 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30"
      >
        {deleting ? "Deleting..." : "Delete Community"}
      </button>
      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : null}
    </div>
  );
}
