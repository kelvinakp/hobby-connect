"use client";

import Image from "next/image";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { getDisplayName } from "@/lib/display-name";

export interface Notification {
  id: string;
  type: "join" | "leave" | "message" | "announcement" | "event";
  hobbyId: string;
  userName: string;
  userAvatar: string | null;
  hobbyTitle: string;
  createdAt: string;
  messagePreview?: string;
  title?: string;
  targetHref?: string;
  read: boolean;
}

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  markAllRead: () => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(
  undefined
);

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx)
    throw new Error(
      "useNotifications must be used within NotificationProvider"
    );
  return ctx;
}

export default function NotificationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = createClient();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toast, setToast] = useState<Notification | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seenNotificationIdsRef = useRef<Set<string>>(new Set());

  const ownedHobbyIdsRef = useRef<Set<string>>(new Set());
  const watchedHobbyIdsRef = useRef<Set<string>>(new Set());
  const hobbyTitlesRef = useRef<Map<string, string>>(new Map());

  const showToast = useCallback((notif: Notification) => {
    setToast(notif);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 5000);
  }, []);

  const pushNotification = useCallback(
    (notif: Notification) => {
      if (seenNotificationIdsRef.current.has(notif.id)) return;
      seenNotificationIdsRef.current.add(notif.id);
      setNotifications((prev) => [notif, ...prev]);
      showToast(notif);
    },
    [showToast],
  );

  useEffect(() => {
    let interestChannelRef: ReturnType<typeof supabase.channel> | null = null;
    let messageChannelRef: ReturnType<typeof supabase.channel> | null = null;
    let announcementChannelRef: ReturnType<typeof supabase.channel> | null = null;
    let eventChannelRef: ReturnType<typeof supabase.channel> | null = null;
    let profileChannelRef: ReturnType<typeof supabase.channel> | null = null;

    async function setup() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Listen for ban status changes on the current user.
      const profileChannel = supabase
        .channel(`profile-ban-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "profiles",
            filter: `id=eq.${user.id}`,
          },
          (payload) => {
            const row = payload.new as { is_banned?: boolean | null } | null;
            if (row?.is_banned) {
              supabase.auth.signOut();
              window.location.href = "/login?banned=1";
            }
          },
        )
        .subscribe();
      profileChannelRef = profileChannel;

      const { data: myHobbies } = await supabase
        .from("hobbies")
        .select("id, title")
        .eq("created_by", user.id);

      const { data: joinedRows } = await supabase
        .from("interests")
        .select("hobby_id, hobbies(title)")
        .eq("user_id", user.id);

      const ownedIds = new Set<string>();
      const watchedIds = new Set<string>();
      const titles = new Map<string, string>();
      for (const h of (myHobbies ?? []) as { id: string; title: string }[]) {
        ownedIds.add(h.id);
        watchedIds.add(h.id);
        titles.set(h.id, h.title);
      }
      for (const row of (joinedRows ?? []) as {
        hobby_id: string;
        hobbies: { title: string } | null;
      }[]) {
        watchedIds.add(row.hobby_id);
        if (row.hobbies?.title) titles.set(row.hobby_id, row.hobbies.title);
      }
      ownedHobbyIdsRef.current = ownedIds;
      watchedHobbyIdsRef.current = watchedIds;
      hobbyTitlesRef.current = titles;

      const interestChannel = supabase
        .channel("interest-notifications")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "interests",
          },
          async (payload) => {
            const record = payload.new as {
              id: string;
              hobby_id: string;
              user_id: string;
              created_at: string;
            };

            // Keep watched communities in sync when current user joins/leaves.
            if (record.user_id === user.id) {
              watchedHobbyIdsRef.current.add(record.hobby_id);
              if (!hobbyTitlesRef.current.has(record.hobby_id)) {
                const { data: hobby } = await supabase
                  .from("hobbies")
                  .select("id, title")
                  .eq("id", record.hobby_id)
                  .maybeSingle();
                const row = hobby as { id: string; title: string } | null;
                if (row?.title) hobbyTitlesRef.current.set(record.hobby_id, row.title);
              }
              return;
            }

            if (!ownedHobbyIdsRef.current.has(record.hobby_id)) return;

            const { data: profile } = await supabase
              .from("public_profiles")
              .select("id, first_name, last_name, avatar_url")
              .eq("id", record.user_id)
              .single();

            const p = profile as {
              first_name?: string | null;
              last_name?: string | null;
              avatar_url: string | null;
            } | null;

            const notif: Notification = {
              id: record.id,
              type: "join",
              hobbyId: record.hobby_id,
              userName: getDisplayName(p, "Someone"),
              userAvatar: p?.avatar_url ?? null,
              hobbyTitle:
                hobbyTitlesRef.current.get(record.hobby_id) ?? "your hobby",
              createdAt: record.created_at,
              read: false,
            };

            pushNotification(notif);
          }
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "interests",
          },
          async (payload) => {
            const record = payload.old as {
              id: string;
              hobby_id?: string;
              user_id?: string;
              created_at?: string;
            };
            if (!record.hobby_id || !record.user_id) return;
            if (record.user_id === user.id) {
              watchedHobbyIdsRef.current.delete(record.hobby_id);
              return;
            }
            if (!ownedHobbyIdsRef.current.has(record.hobby_id)) return;

            const { data: profile } = await supabase
              .from("public_profiles")
              .select("id, first_name, last_name, avatar_url")
              .eq("id", record.user_id)
              .single();

            const p = profile as {
              first_name?: string | null;
              last_name?: string | null;
              avatar_url: string | null;
            } | null;

            const notif: Notification = {
              id: `leave-${record.id}`,
              type: "leave",
              hobbyId: record.hobby_id,
              userName: getDisplayName(p, "Someone"),
              userAvatar: p?.avatar_url ?? null,
              hobbyTitle:
                hobbyTitlesRef.current.get(record.hobby_id) ?? "your hobby",
              createdAt: record.created_at ?? new Date().toISOString(),
              read: false,
            };

            pushNotification(notif);
          }
        )
        .subscribe();

      interestChannelRef = interestChannel;

      const messageChannel = supabase
        .channel(`message-notifications-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
          },
          async (payload) => {
            const record = payload.new as {
              id: string;
              community_id: string;
              user_id: string;
              content: string;
              created_at: string;
            };
            if (!watchedHobbyIdsRef.current.has(record.community_id)) return;
            if (record.user_id === user.id) return;

            const { data: profile } = await supabase
              .from("public_profiles")
              .select("id, first_name, last_name, avatar_url")
              .eq("id", record.user_id)
              .single();

            const p = profile as {
              first_name?: string | null;
              last_name?: string | null;
              avatar_url: string | null;
            } | null;

            const notif: Notification = {
              id: `msg-${record.id}`,
              type: "message",
              hobbyId: record.community_id,
              userName: getDisplayName(p, "Someone"),
              userAvatar: p?.avatar_url ?? null,
              hobbyTitle:
                hobbyTitlesRef.current.get(record.community_id) ?? "community",
              createdAt: record.created_at,
              messagePreview: record.content,
              read: false,
            };

            pushNotification(notif);
          }
        )
        .subscribe();
      messageChannelRef = messageChannel;

      const announcementChannel = supabase
        .channel(`announcement-notifications-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "posts",
          },
          async (payload) => {
            const record = payload.new as {
              id: string;
              author_id: string;
              title: string;
              status: "PUBLISHED" | "PENDING_REVIEW" | "REJECTED";
              created_at: string;
            };
            if (record.status !== "PUBLISHED") return;
            if (record.author_id === user.id) return;

            const { data: profile } = await supabase
              .from("public_profiles")
              .select("id, first_name, last_name, avatar_url")
              .eq("id", record.author_id)
              .maybeSingle();

            const p = profile as {
              first_name?: string | null;
              last_name?: string | null;
              avatar_url: string | null;
            } | null;

            const notif: Notification = {
              id: `announcement-${record.id}`,
              type: "announcement",
              hobbyId: "",
              userName: getDisplayName(p, "Admin"),
              userAvatar: p?.avatar_url ?? null,
              hobbyTitle: "Uni Announcement",
              createdAt: record.created_at,
              title: record.title,
              targetHref: "/",
              read: false,
            };

            pushNotification(notif);
          },
        )
        .subscribe();
      announcementChannelRef = announcementChannel;

      const eventChannel = supabase
        .channel(`event-notifications-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "events",
          },
          async (payload) => {
            const record = payload.new as {
              id: string;
              community_id: string;
              creator_id: string;
              title: string;
              status: "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "COMPLETED";
              created_at: string;
            };
            if (record.status !== "APPROVED") return;
            if (!watchedHobbyIdsRef.current.has(record.community_id)) return;
            if (record.creator_id === user.id) return;

            const { data: profile } = await supabase
              .from("public_profiles")
              .select("id, first_name, last_name, avatar_url")
              .eq("id", record.creator_id)
              .maybeSingle();

            const p = profile as {
              first_name?: string | null;
              last_name?: string | null;
              avatar_url: string | null;
            } | null;

            const notif: Notification = {
              id: `event-${record.id}`,
              type: "event",
              hobbyId: record.community_id,
              userName: getDisplayName(p, "Community Leader"),
              userAvatar: p?.avatar_url ?? null,
              hobbyTitle:
                hobbyTitlesRef.current.get(record.community_id) ?? "community",
              createdAt: record.created_at,
              title: record.title,
              targetHref: `/communities/${record.community_id}?tab=events`,
              read: false,
            };

            pushNotification(notif);
          },
        )
        .subscribe();
      eventChannelRef = eventChannel;
    }

    setup();

    return () => {
      if (interestChannelRef) supabase.removeChannel(interestChannelRef);
      if (messageChannelRef) supabase.removeChannel(messageChannelRef);
      if (announcementChannelRef) supabase.removeChannel(announcementChannelRef);
      if (eventChannelRef) supabase.removeChannel(eventChannelRef);
      if (profileChannelRef) supabase.removeChannel(profileChannelRef);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [supabase, pushNotification]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function clearAll() {
    setNotifications([]);
    seenNotificationIdsRef.current.clear();
  }

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, markAllRead, clearAll }}
    >
      {children}

      {/* ── Toast popup ── */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[100] w-80 animate-slide-up rounded-xl border border-charcoal-100 bg-white p-4 shadow-xl dark:border-charcoal-700 dark:bg-charcoal-800">
          <div className="flex items-start gap-3">
            {toast.userAvatar ? (
              <Image
                src={toast.userAvatar}
                alt=""
                width={36}
                height={36}
                className="h-9 w-9 shrink-0 rounded-full bg-brand-50 dark:bg-brand-900/30"
                unoptimized
              />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-400 text-sm font-bold text-white">
                {toast.userName.charAt(0)}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-charcoal dark:text-white">
                {toast.userName}
              </p>
              <p className="mt-0.5 text-xs text-charcoal-400 dark:text-charcoal-300">
                {toast.type === "join" ? (
                  <>
                    joined{" "}
                    <span className="font-semibold text-brand dark:text-brand-300">
                      {toast.hobbyTitle}
                    </span>
                  </>
                ) : toast.type === "leave" ? (
                  <>
                    left{" "}
                    <span className="font-semibold text-brand dark:text-brand-300">
                      {toast.hobbyTitle}
                    </span>
                  </>
                ) : toast.type === "announcement" ? (
                  <>
                    published a new{" "}
                    <span className="font-semibold text-brand dark:text-brand-300">
                      uni announcement
                    </span>
                  </>
                ) : toast.type === "event" ? (
                  <>
                    scheduled an event in{" "}
                    <span className="font-semibold text-brand dark:text-brand-300">
                      {toast.hobbyTitle}
                    </span>
                  </>
                ) : (
                  <>
                    sent a message in{" "}
                    <span className="font-semibold text-brand dark:text-brand-300">
                      {toast.hobbyTitle}
                    </span>
                  </>
                )}
              </p>
              {toast.type === "message" && toast.messagePreview && (
                <p className="mt-1 truncate text-[11px] text-charcoal-300 dark:text-charcoal-500">
                  "{toast.messagePreview}"
                </p>
              )}
              {(toast.type === "announcement" || toast.type === "event") &&
                toast.title && (
                  <p className="mt-1 truncate text-[11px] text-charcoal-300 dark:text-charcoal-500">
                    "{toast.title}"
                  </p>
                )}
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="shrink-0 rounded p-0.5 text-charcoal-300 hover:text-charcoal-500 dark:text-charcoal-500 dark:hover:text-charcoal-300"
              aria-label="Dismiss"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18 18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}
