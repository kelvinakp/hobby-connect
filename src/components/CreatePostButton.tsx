"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import CreatePostModal from "@/components/CreatePostModal";

interface Props {
  canManageCommunity?: boolean;
}

export default function CreatePostButton({ canManageCommunity = false }: Props) {
  const [role, setRole] = useState<string>("user");
  const [isCommunityLeader, setIsCommunityLeader] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      setRole((profile as { role: string } | null)?.role ?? "user");

      const { data: leaderCommunity } = await supabase
        .from("hobbies")
        .select("id")
        .eq("created_by", user.id)
        .limit(1)
        .maybeSingle();
      setIsCommunityLeader(!!leaderCommunity);
    }
    load();
  }, []);

  const canPost = role === "admin" || role === "moderator" || canManageCommunity || isCommunityLeader;
  if (!canPost) return null;

  return (
    <>
      <div className="mx-auto mb-6 flex max-w-3xl justify-end">
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand to-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition-all hover:-translate-y-[1px] hover:shadow-xl hover:brightness-110"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          {role === "admin" ? "Publish Post" : "Submit Post"}
        </button>
      </div>

      <CreatePostModal
        open={showModal}
        onClose={() => setShowModal(false)}
        canManageCommunity={canManageCommunity || isCommunityLeader}
        onCreated={() => {
          window.dispatchEvent(new CustomEvent("posts:refresh"));
          setShowModal(false);
        }}
      />
    </>
  );
}
