"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getDisplayName, getInitials } from "@/lib/display-name";
import { formatShortDate, formatTime } from "@/lib/date-locale";

interface UserRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url: string | null;
  role: string;
  is_banned: boolean;
  created_at: string;
}

interface RecentMessage {
  id: string;
  content: string;
  created_at: string;
  community_id: string;
  user_id: string;
  authorName: string;
  hobbyTitle: string;
}

interface RecentEvent {
  id: string;
  title: string;
  location: string;
  event_date: string;
  status: string;
  community_id: string;
  hobbyTitle: string;
}

export default function ModeratorDashboard() {
  const supabase = createClient();
  const router = useRouter();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [recentMessages, setRecentMessages] = useState<RecentMessage[]>([]);
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMod, setIsMod] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setCurrentUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const role = (profile as { role: string } | null)?.role;

      if (role !== "moderator" && role !== "admin") {
        setIsMod(false);
        setLoading(false);
        return;
      }

      setIsMod(true);

      const { data: allUsers } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, avatar_url, role, is_banned, created_at")
        .order("created_at", { ascending: true });

      setUsers((allUsers as UserRow[]) ?? []);

      const { data: messagesData } = await supabase
        .from("messages")
        .select("id, content, created_at, community_id, user_id, profiles(first_name, last_name)")
        .order("created_at", { ascending: false })
        .limit(20);

      const msgRows = (messagesData ?? []) as {
        id: string;
        content: string;
        created_at: string;
        community_id: string;
        user_id: string;
        profiles: { first_name?: string | null; last_name?: string | null } | null;
      }[];
      const communityIds = [...new Set(msgRows.map((m) => m.community_id))];
      const { data: hobbiesData } = await supabase
        .from("hobbies")
        .select("id, title")
        .in("id", communityIds);
      const hobbyMap = new Map(
        ((hobbiesData ?? []) as { id: string; title: string }[]).map((h) => [h.id, h.title])
      );
      setRecentMessages(
        msgRows.map((m) => ({
          id: m.id,
          content: m.content,
          created_at: m.created_at,
          community_id: m.community_id,
          user_id: m.user_id,
          authorName: getDisplayName(m.profiles, "Unknown"),
          hobbyTitle: hobbyMap.get(m.community_id) ?? "Community",
        }))
      );

      const { data: eventsData } = await supabase
        .from("events")
        .select("id, title, location, event_date, status, community_id")
        .order("event_date", { ascending: false })
        .limit(20);

      const eventRows = (eventsData ?? []) as {
        id: string;
        title: string;
        location: string;
        event_date: string;
        status: string;
        community_id: string;
      }[];
      const eventCommunityIds = [...new Set(eventRows.map((e) => e.community_id))];
      const { data: eventHobbiesData } = await supabase
        .from("hobbies")
        .select("id, title")
        .in("id", eventCommunityIds);
      const eventHobbyMap = new Map(
        ((eventHobbiesData ?? []) as { id: string; title: string }[]).map((h) => [h.id, h.title])
      );
      setRecentEvents(
        eventRows.map((e) => ({
          ...e,
          hobbyTitle: eventHobbyMap.get(e.community_id) ?? "Community",
        }))
      );

      setLoading(false);
    }

    load();
  }, [supabase, router]);

  async function handleDeleteMessage(id: string) {
    if (!confirm("Delete this message? This cannot be undone.")) return;
    setDeletingMessageId(id);
    const { error } = await supabase.from("messages").delete().eq("id", id);
    if (!error) setRecentMessages((prev) => prev.filter((m) => m.id !== id));
    setDeletingMessageId(null);
  }

  async function handleDeleteEvent(id: string) {
    if (!confirm("Delete this event? This cannot be undone.")) return;
    setDeletingEventId(id);
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (!error) setRecentEvents((prev) => prev.filter((e) => e.id !== id));
    setDeletingEventId(null);
  }

  async function toggleBan(userId: string, currentlyBanned: boolean) {
    const name = getDisplayName(users.find((u) => u.id === userId), "this user");
    const message = currentlyBanned
      ? `Unban ${name}? They will be able to sign in and participate again.`
      : `Are you sure you want to ban ${name}? They will not be able to sign in or participate until unbanned.`;
    if (!confirm(message)) return;

    setTogglingId(userId);

    const { error } = await supabase
      .from("profiles")
      .update({ is_banned: !currentlyBanned })
      .eq("id", userId);

    if (!error) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_banned: !currentlyBanned } : u))
      );
    }

    setTogglingId(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-brand border-t-transparent" />
      </div>
    );
  }

  if (!isMod) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-800 dark:bg-red-900/20">
        <svg className="mx-auto mb-3 h-10 w-10 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
        <h2 className="text-lg font-semibold text-red-700 dark:text-red-300">Access Denied</h2>
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
          Only moderators and admins can access this dashboard.
        </p>
        <a
          href="/"
          className="mt-4 inline-block rounded-lg bg-charcoal-100 px-4 py-2 text-sm font-medium text-charcoal-700 transition-colors hover:bg-charcoal-200 dark:bg-charcoal-700 dark:text-charcoal-200 dark:hover:bg-charcoal-600"
        >
          Go to Home
        </a>
      </div>
    );
  }

  const filtered = search.trim()
    ? users.filter(
        (u) =>
          getDisplayName(u, "").toLowerCase().includes(search.toLowerCase()) ||
          (u.email && u.email.toLowerCase().includes(search.toLowerCase()))
      )
    : users;

  const bannedCount = users.filter((u) => u.is_banned).length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-charcoal-100 bg-white p-4 dark:border-charcoal-700 dark:bg-charcoal-800/60">
          <p className="text-2xl font-bold text-charcoal dark:text-white">{users.length}</p>
          <p className="text-xs text-charcoal-400 dark:text-charcoal-400">Total Users</p>
        </div>
        <div className="rounded-xl border border-charcoal-100 bg-white p-4 dark:border-charcoal-700 dark:bg-charcoal-800/60">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{users.length - bannedCount}</p>
          <p className="text-xs text-charcoal-400 dark:text-charcoal-400">Active</p>
        </div>
        <div className="rounded-xl border border-charcoal-100 bg-white p-4 dark:border-charcoal-700 dark:bg-charcoal-800/60">
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{bannedCount}</p>
          <p className="text-xs text-charcoal-400 dark:text-charcoal-400">Banned</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-300 dark:text-charcoal-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        <input
          type="text"
          placeholder="Search users by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="block w-full rounded-xl border border-charcoal-200 bg-white py-2.5 pl-10 pr-4 text-sm text-charcoal placeholder:text-charcoal-300 transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-charcoal-600 dark:bg-charcoal-800 dark:text-white dark:placeholder:text-charcoal-500"
        />
      </div>

      {/* User list */}
      <div className="overflow-hidden rounded-xl border border-charcoal-100 bg-white dark:border-charcoal-700 dark:bg-charcoal-800/60">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-charcoal-100 bg-charcoal-50/50 dark:border-charcoal-700 dark:bg-charcoal-800/80">
              <th className="px-4 py-3 font-medium text-charcoal-500 dark:text-charcoal-300">User</th>
              <th className="px-4 py-3 font-medium text-charcoal-500 dark:text-charcoal-300">Email</th>
              <th className="px-4 py-3 font-medium text-charcoal-500 dark:text-charcoal-300">Role</th>
              <th className="px-4 py-3 font-medium text-charcoal-500 dark:text-charcoal-300">Status</th>
              <th className="px-4 py-3 text-right font-medium text-charcoal-500 dark:text-charcoal-300">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal-100 dark:divide-charcoal-700">
            {filtered.map((user) => {
              const isCurrentUser = user.id === currentUserId;

              return (
                <tr key={user.id} className="transition-colors hover:bg-charcoal-50/50 dark:hover:bg-charcoal-800/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {user.avatar_url ? (
                        <Image src={user.avatar_url} alt="" width={32} height={32} className="h-8 w-8 rounded-full bg-brand-50 dark:bg-brand-900/30" unoptimized />
                      ) : (
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand dark:bg-brand-900/30 dark:text-brand-300">
                          {getInitials(user)}
                        </span>
                      )}
                      <span className="font-medium text-charcoal dark:text-white">
                        {getDisplayName(user, "Unknown")}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-charcoal-400 dark:text-charcoal-400">
                    {user.email}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      user.role === "moderator"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                        : "bg-charcoal-100 text-charcoal-500 dark:bg-charcoal-700 dark:text-charcoal-300"
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {user.is_banned ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-300">
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clipRule="evenodd" />
                        </svg>
                        Banned
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                        </svg>
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isCurrentUser ? (
                      <span className="text-xs text-charcoal-300 dark:text-charcoal-500">You</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleBan(user.id, user.is_banned)}
                        disabled={togglingId === user.id}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all disabled:opacity-50 ${
                          user.is_banned
                            ? "bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-900/40"
                            : "bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/40"
                        }`}
                      >
                        {togglingId === user.id ? (
                          <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : user.is_banned ? (
                          <>
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                            </svg>
                            Unban
                          </>
                        ) : (
                          <>
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                            Ban
                          </>
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-charcoal-400 dark:text-charcoal-500">
            No users found matching your search.
          </div>
        )}
      </div>

      {/* Content Moderation */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-charcoal-100 bg-white dark:border-charcoal-700 dark:bg-charcoal-800/60">
          <div className="border-b border-charcoal-100 bg-charcoal-50/50 px-4 py-3 dark:border-charcoal-700 dark:bg-charcoal-800/80">
            <h3 className="text-sm font-semibold text-charcoal dark:text-white">Recent chat messages</h3>
            <p className="mt-0.5 text-xs text-charcoal-400 dark:text-charcoal-500">Remove inappropriate content</p>
          </div>
          <ul className="max-h-80 overflow-y-auto divide-y divide-charcoal-100 dark:divide-charcoal-700">
            {recentMessages.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-charcoal-400 dark:text-charcoal-500">No messages yet</li>
            ) : (
              recentMessages.map((msg) => (
                <li key={msg.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-charcoal-400 dark:text-charcoal-500">
                      {msg.authorName} · {msg.hobbyTitle}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-sm text-charcoal dark:text-white">{msg.content}</p>
                    <p className="mt-1 text-[10px] text-charcoal-300 dark:text-charcoal-500">
                      {formatShortDate(msg.created_at)} {formatTime(msg.created_at)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteMessage(msg.id)}
                    disabled={deletingMessageId === msg.id}
                    className="shrink-0 rounded p-1.5 text-red-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-900/20"
                    title="Delete message"
                  >
                    {deletingMessageId === msg.id ? (
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="overflow-hidden rounded-xl border border-charcoal-100 bg-white dark:border-charcoal-700 dark:bg-charcoal-800/60">
          <div className="border-b border-charcoal-100 bg-charcoal-50/50 px-4 py-3 dark:border-charcoal-700 dark:bg-charcoal-800/80">
            <h3 className="text-sm font-semibold text-charcoal dark:text-white">Recent events</h3>
            <p className="mt-0.5 text-xs text-charcoal-400 dark:text-charcoal-500">Remove inappropriate events</p>
          </div>
          <ul className="max-h-80 overflow-y-auto divide-y divide-charcoal-100 dark:divide-charcoal-700">
            {recentEvents.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-charcoal-400 dark:text-charcoal-500">No events yet</li>
            ) : (
              recentEvents.map((ev) => (
                <li key={ev.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-charcoal-400 dark:text-charcoal-500">{ev.hobbyTitle}</p>
                    <p className="mt-0.5 font-medium text-charcoal dark:text-white">{ev.title}</p>
                    <p className="mt-0.5 text-xs text-charcoal-400 dark:text-charcoal-500">{ev.location}</p>
                    <p className="mt-1 text-[10px] text-charcoal-300 dark:text-charcoal-500">
                      {formatShortDate(ev.event_date)} · {ev.status.replace("_", " ")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteEvent(ev.id)}
                    disabled={deletingEventId === ev.id}
                    className="shrink-0 rounded p-1.5 text-red-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-900/20"
                    title="Delete event"
                  >
                    {deletingEventId === ev.id ? (
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
