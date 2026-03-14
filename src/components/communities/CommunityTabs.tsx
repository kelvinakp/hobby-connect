"use client";

import { useState } from "react";
import CommunityChat from "./CommunityChat";
import EventsTab from "./EventsTab";
import MembersTab from "./MembersTab";

const TABS = ["Open Chat", "Events", "Members"] as const;
type Tab = (typeof TABS)[number];

interface Props {
  communityId: string;
  createdBy: string;
  userId: string | null;
  userRole: string | null;
}

export default function CommunityTabs({ communityId, createdBy, userId, userRole }: Props) {
  const [active, setActive] = useState<Tab>("Open Chat");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative mt-4 flex shrink-0 gap-1 rounded-lg bg-charcoal-50 p-1 dark:bg-charcoal-800">
        {TABS.map((tab) => {
          const isActive = tab === active;
          return (
            <button
              key={tab}
              onClick={() => setActive(tab)}
              className={`relative z-10 flex-1 rounded-md px-4 py-2 text-sm font-semibold transition-all ${
                isActive
                  ? "bg-brand text-white shadow-md shadow-brand/25"
                  : "text-charcoal-500 hover:text-charcoal-700 dark:text-charcoal-300 dark:hover:text-white"
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col">
        {active === "Open Chat" ? (
          <CommunityChat communityId={communityId} userId={userId} userRole={userRole} />
        ) : active === "Events" ? (
          <EventsTab communityId={communityId} userId={userId} userRole={userRole} />
        ) : (
          <MembersTab communityId={communityId} createdBy={createdBy} userId={userId} userRole={userRole} />
        )}
      </div>
    </div>
  );
}
