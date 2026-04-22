"use client";

import { useNotifications } from "@/components/NotificationProvider";

export default function DesktopRightRail() {
  const { unreadCount } = useNotifications();

  return (
    <div className="sticky top-[4.5rem] space-y-4">
      <div className="rounded-2xl border border-charcoal-100/80 bg-white/80 p-4 shadow-sm dark:border-charcoal-700/80 dark:bg-charcoal-800/60">
        <h2 className="text-sm font-semibold text-charcoal dark:text-white">
          Notifications
        </h2>
        <p className="mt-2 text-xs leading-5 text-charcoal-400 dark:text-charcoal-300">
          You have{" "}
          <span className="font-semibold text-brand dark:text-brand-300">
            {unreadCount}
          </span>{" "}
          unread {unreadCount === 1 ? "notification" : "notifications"}.
        </p>
        <p className="mt-1 text-[11px] text-charcoal-300 dark:text-charcoal-500">
          Open the bell icon in the top bar to review them.
        </p>
      </div>

      <div className="rounded-2xl border border-charcoal-100/80 bg-white/80 p-4 shadow-sm dark:border-charcoal-700/80 dark:bg-charcoal-800/60">
        <h3 className="text-sm font-semibold text-charcoal dark:text-white">
          Quick tips
        </h3>
        <p className="mt-2 text-xs leading-5 text-charcoal-400 dark:text-charcoal-300">
          Keep post titles short and specific, and include one clear callout in
          the first sentence so students can scan updates faster.
        </p>
        <p className="mt-2 text-[11px] leading-5 text-charcoal-300 dark:text-charcoal-500">
          Example: "Classroom changed to B-204 for Friday workshop."
        </p>
      </div>
    </div>
  );
}
