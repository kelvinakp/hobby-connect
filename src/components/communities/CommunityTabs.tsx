"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import CommunityChat from "./CommunityChat";
import EventsTab from "./EventsTab";
import MembersTab from "./MembersTab";

const TABS = [
  { id: "Open Chat" as const, label: "Open Chat", icon: "chat" },
  { id: "Events" as const, label: "Events", icon: "calendar" },
  { id: "Members" as const, label: "Members", icon: "users" },
];
type Tab = (typeof TABS)[number]["id"];

const TabIcon = ({ icon, className }: { icon: string; className?: string }) => {
  const c = className ?? "h-4 w-4";
  if (icon === "chat")
    return (
      <svg className={c} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
      </svg>
    );
  if (icon === "calendar")
    return (
      <svg className={c} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
      </svg>
    );
  return (
    <svg className={c} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  );
};

interface Props {
  communityId: string;
  createdBy: string;
  userId: string | null;
  userRole: string | null;
  canAccessCommunity: boolean;
}

export default function CommunityTabs({
  communityId,
  createdBy,
  userId,
  userRole,
  canAccessCommunity,
}: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tabFromQuery = useMemo(() => {
    const tab = searchParams.get("tab");
    if (tab === "events") return "Events" as Tab;
    if (tab === "members") return "Members" as Tab;
    return "Open Chat" as Tab;
  }, [searchParams]);
  const [active, setActive] = useState<Tab>(tabFromQuery);
  const [loadedTabs, setLoadedTabs] = useState<Record<Tab, boolean>>({
    "Open Chat": true,
    Events: tabFromQuery === "Events",
    Members: tabFromQuery === "Members",
  });

  useEffect(() => {
    setActive(tabFromQuery);
    setLoadedTabs((prev) => ({ ...prev, [tabFromQuery]: true }));
  }, [tabFromQuery]);

  function setTabAndUrl(tab: Tab) {
    setActive(tab);
    setLoadedTabs((prev) => ({ ...prev, [tab]: true }));
    const params = new URLSearchParams(searchParams.toString());
    const value = tab === "Open Chat" ? "chat" : tab.toLowerCase();
    params.set("tab", value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  if (!canAccessCommunity) {
    return (
      <div className="mt-4 flex min-h-0 flex-1 items-center justify-center rounded-xl border border-dashed border-charcoal-200 bg-white p-8 text-center dark:border-charcoal-700 dark:bg-charcoal-800/40">
        <div className="max-w-md">
          <h3 className="text-base font-semibold text-charcoal dark:text-white">
            Join this community to view details
          </h3>
          <p className="mt-1 text-sm text-charcoal-400 dark:text-charcoal-500">
            Open Chat, Events, and Members are available after you join from Uni Announcement.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-md shadow-brand/25 transition-all hover:bg-brand-600"
          >
            Go to Uni Announcement
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative mt-4 flex shrink-0 gap-1 rounded-xl bg-charcoal-50 p-1.5 dark:bg-charcoal-800">
        {TABS.map((tab) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              onClick={() => setTabAndUrl(tab.id)}
              className={`relative z-10 flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                isActive
                  ? "bg-brand text-white shadow-md shadow-brand/25"
                  : "text-charcoal-500 hover:text-charcoal-700 dark:text-charcoal-300 dark:hover:text-white"
              }`}
            >
              <TabIcon icon={tab.icon} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col">
        {loadedTabs["Open Chat"] && active === "Open Chat" ? (
          <CommunityChat communityId={communityId} userId={userId} userRole={userRole} />
        ) : loadedTabs.Events && active === "Events" ? (
          <EventsTab communityId={communityId} userId={userId} userRole={userRole} />
        ) : loadedTabs.Members && active === "Members" ? (
          <MembersTab communityId={communityId} createdBy={createdBy} userId={userId} userRole={userRole} />
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          </div>
        )}
      </div>
    </div>
  );
}
