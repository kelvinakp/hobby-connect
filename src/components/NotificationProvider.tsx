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
  userName: string;
  userAvatar: string | null;
  hobbyTitle: string;
  createdAt: string;
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

  const myHobbyIdsRef = useRef<Set<string>>(new Set());
  const hobbyTitlesRef = useRef<Map<string, string>>(new Map());

  const showToast = useCallback((notif: Notification) => {
    setToast(notif);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 5000);
  }, []);

  useEffect(() => {
    let interestChannelRef: ReturnType<typeof supabase.channel> | null = null;
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

      if (!myHobbies || myHobbies.length === 0) return;

      const ids = new Set<string>();
      const titles = new Map<string, string>();
      for (const h of myHobbies as { id: string; title: string }[]) {
        ids.add(h.id);
        titles.set(h.id, h.title);
      }
      myHobbyIdsRef.current = ids;
      hobbyTitlesRef.current = titles;

      const channel = supabase
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

            if (!myHobbyIdsRef.current.has(record.hobby_id)) return;
            if (record.user_id === user.id) return;

            const { data: profile } = await supabase
              .from("profiles")
              .select("first_name, last_name, avatar_url")
              .eq("id", record.user_id)
              .single();

            const p = profile as {
              first_name?: string | null;
              last_name?: string | null;
              avatar_url: string | null;
            } | null;

            const notif: Notification = {
              id: record.id,
              userName: getDisplayName(p, "Someone"),
              userAvatar: p?.avatar_url ?? null,
              hobbyTitle:
                hobbyTitlesRef.current.get(record.hobby_id) ?? "your hobby",
              createdAt: record.created_at,
              read: false,
            };

            setNotifications((prev) => [notif, ...prev]);
            showToast(notif);
          }
        )
        .subscribe();

      interestChannelRef = channel;
    }

    setup();

    return () => {
      if (interestChannelRef) supabase.removeChannel(interestChannelRef);
      if (profileChannelRef) supabase.removeChannel(profileChannelRef);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [supabase, showToast]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function clearAll() {
    setNotifications([]);
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
                is interested in{" "}
                <span className="font-semibold text-brand dark:text-brand-300">
                  {toast.hobbyTitle}
                </span>
              </p>
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
