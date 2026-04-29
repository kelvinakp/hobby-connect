"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import CreatePostModal from "@/components/CreatePostModal";

interface Props {
  canManageCommunity?: boolean;
  mode?: "admin-publish" | "leader-submit";
  inRow?: boolean;
  wrapperClassName?: string;
}

export default function CreatePostButton({
  canManageCommunity = false,
  mode = "admin-publish",
  inRow = false,
  wrapperClassName = "",
}: Props) {
  const [role, setRole] = useState<string>("user");
  const [adminMode, setAdminMode] = useState(true);
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
    }
    load();
  }, []);

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

  const canPost =
    mode === "admin-publish"
      ? role === "admin" && adminMode
      : canManageCommunity;
  if (!canPost) return null;

  return (
    <>
      <div
        className={
          inRow
            ? `flex justify-end ${wrapperClassName}`.trim()
            : `mx-auto mb-6 flex max-w-3xl justify-end ${wrapperClassName}`.trim()
        }
      >
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-brand to-brand-600 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-brand/25 transition-all hover:-translate-y-[1px] hover:shadow-lg hover:brightness-110 sm:gap-2 sm:px-3.5 sm:text-sm"
        >
          <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          {mode === "admin-publish" ? "Publish" : "Submit"}
        </button>
      </div>

      <CreatePostModal
        open={showModal}
        onClose={() => setShowModal(false)}
        canManageCommunity={canManageCommunity}
        onCreated={() => {
          window.dispatchEvent(new CustomEvent("posts:refresh"));
          setShowModal(false);
        }}
      />
    </>
  );
}
