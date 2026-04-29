"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
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

interface PendingPost {
  id: string;
  title: string;
  content: string;
  created_at: string;
  community_id: string | null;
  author_id: string;
  authorName: string;
  hobbyTitle: string | null;
}

interface PublishedPost {
  id: string;
  title: string;
  created_at: string;
  authorName: string;
  hobbyTitle: string | null;
}

const TABS = [
  { id: "overview" as const, label: "Overview", icon: "chart" },
  { id: "users" as const, label: "Users", icon: "users" },
  { id: "posts" as const, label: "Posts", icon: "doc" },
  { id: "moderation" as const, label: "Moderation", icon: "shield" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function TabIcon({ icon, className = "h-4 w-4" }: { icon: string; className?: string }) {
  if (icon === "chart")
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
    );
  if (icon === "users")
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
      </svg>
    );
  if (icon === "doc")
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    );
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
    </svg>
  );
}

export default function AdminDashboard() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [recentMessages, setRecentMessages] = useState<RecentMessage[]>([]);
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [pendingPosts, setPendingPosts] = useState<PendingPost[]>([]);
  const [publishedPosts, setPublishedPosts] = useState<PublishedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminMode, setAdminMode] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [reviewingPostId, setReviewingPostId] = useState<string | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [msgFilter, setMsgFilter] = useState<string>("all");
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [leaderCount, setLeaderCount] = useState(0);

  useEffect(() => {
    const modeValue =
      typeof window !== "undefined"
        ? window.localStorage.getItem("sidebar-admin-mode")
        : null;
    setAdminMode(modeValue !== "user");
  }, []);

  useEffect(() => {
    function onModeChanged() {
      const modeValue =
        typeof window !== "undefined"
          ? window.localStorage.getItem("sidebar-admin-mode")
          : null;
      setAdminMode(modeValue !== "user");
    }
    window.addEventListener("admin-mode-changed", onModeChanged);
    return () => window.removeEventListener("admin-mode-changed", onModeChanged);
  }, []);

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

      if (role !== "admin") {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setIsAdmin(true);

      const [usersRes, messagesRes, eventsRes, pendingPostsRes, publishedPostsRes, hobbiesRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, first_name, last_name, email, avatar_url, role, is_banned, created_at")
          .order("created_at", { ascending: true }),
        supabase
          .from("messages")
          .select("id, content, created_at, community_id, user_id, profiles(first_name, last_name)")
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("events")
          .select("id, title, location, event_date, status, community_id")
          .order("event_date", { ascending: false })
          .limit(20),
        supabase
          .from("posts")
          .select("id, title, content, created_at, community_id, author_id, profiles:author_id(first_name, last_name)")
          .eq("status", "PENDING_REVIEW")
          .order("created_at", { ascending: true }),
        supabase
          .from("posts")
          .select("id, title, created_at, community_id, profiles:author_id(first_name, last_name)")
          .eq("status", "PUBLISHED")
          .order("created_at", { ascending: false })
          .limit(30),
        supabase
          .from("hobbies")
          .select("created_by"),
      ]);

      const allUsers = (usersRes.data ?? []) as UserRow[];
      setUsers(allUsers);

      const hobbyRows = (hobbiesRes.data ?? []) as { created_by: string }[];
      const uniqueLeaders = new Set(hobbyRows.map((h) => h.created_by));
      setLeaderCount(uniqueLeaders.size);

      const msgRows = (messagesRes.data ?? []) as {
        id: string; content: string; created_at: string; community_id: string; user_id: string;
        profiles: { first_name?: string | null; last_name?: string | null } | null;
      }[];

      const eventRows = (eventsRes.data ?? []) as {
        id: string; title: string; location: string; event_date: string; status: string; community_id: string;
      }[];

      const postRows = (pendingPostsRes.data ?? []) as {
        id: string; title: string; content: string; created_at: string; community_id: string | null; author_id: string;
        profiles: { first_name?: string | null; last_name?: string | null } | null;
      }[];

      const publishedRows = (publishedPostsRes.data ?? []) as {
        id: string; title: string; created_at: string; community_id: string | null;
        profiles: { first_name?: string | null; last_name?: string | null } | null;
      }[];

      const allCommunityIds = Array.from(
        new Set([
          ...msgRows.map((m) => m.community_id),
          ...eventRows.map((e) => e.community_id),
          ...postRows.map((p) => p.community_id).filter((id): id is string => !!id),
          ...publishedRows.map((p) => p.community_id).filter((id): id is string => !!id),
        ])
      );

      let hobbyMap = new Map<string, string>();
      if (allCommunityIds.length > 0) {
        const { data: hobbiesData } = await supabase.from("hobbies").select("id, title").in("id", allCommunityIds);
        hobbyMap = new Map(((hobbiesData ?? []) as { id: string; title: string }[]).map((h) => [h.id, h.title]));
      }

      setRecentMessages(msgRows.map((m) => ({
        id: m.id, content: m.content, created_at: m.created_at, community_id: m.community_id,
        user_id: m.user_id, authorName: getDisplayName(m.profiles, "Unknown"),
        hobbyTitle: hobbyMap.get(m.community_id) ?? "Community",
      })));

      setRecentEvents(eventRows.map((e) => ({ ...e, hobbyTitle: hobbyMap.get(e.community_id) ?? "Community" })));

      setPendingPosts(postRows.map((p) => ({
        id: p.id, title: p.title, content: p.content, created_at: p.created_at,
        community_id: p.community_id, author_id: p.author_id,
        authorName: getDisplayName(p.profiles, "Unknown"),
        hobbyTitle: p.community_id ? hobbyMap.get(p.community_id) ?? "Community" : null,
      })));

      setPublishedPosts(publishedRows.map((p) => ({
        id: p.id, title: p.title, created_at: p.created_at,
        authorName: getDisplayName(p.profiles, "Unknown"),
        hobbyTitle: p.community_id ? hobbyMap.get(p.community_id) ?? "Community" : null,
      })));

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
    const { error } = await supabase.from("profiles").update({ is_banned: !currentlyBanned }).eq("id", userId);
    if (!error) setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_banned: !currentlyBanned } : u)));
    setTogglingId(null);
  }

  async function handleApprovePost(postId: string) {
    setReviewingPostId(postId);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("posts")
      .update({ status: "PUBLISHED", reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
      .eq("id", postId);
    if (!error) setPendingPosts((prev) => prev.filter((p) => p.id !== postId));
    setReviewingPostId(null);
  }

  async function handleRejectPost(postId: string) {
    const note = prompt("Reason for rejection (optional):");
    if (note === null) return;
    setReviewingPostId(postId);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("posts")
      .update({ status: "REJECTED", reviewed_by: user?.id, reviewed_at: new Date().toISOString(), review_note: note || null })
      .eq("id", postId);
    if (!error) setPendingPosts((prev) => prev.filter((p) => p.id !== postId));
    setReviewingPostId(null);
  }

  async function handleDeletePublishedPost(postId: string) {
    if (!confirm("Delete this published post? This cannot be undone.")) return;
    setDeletingPostId(postId);
    const { data, error } = await supabase.from("posts").delete().eq("id", postId).select("id");
    if (error) {
      alert(`Could not delete post: ${error.message}`);
    } else if (!data || data.length === 0) {
      alert("Could not delete post. You may not have permission for this row.");
    } else {
      setPublishedPosts((prev) => prev.filter((p) => p.id !== postId));
    }
    setDeletingPostId(null);
  }

  const msgCommunities = useMemo(() => {
    return Array.from(new Set(recentMessages.map((m) => m.hobbyTitle))).sort();
  }, [recentMessages]);

  const eventCommunities = useMemo(() => {
    return Array.from(new Set(recentEvents.map((e) => e.hobbyTitle))).sort();
  }, [recentEvents]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-brand border-t-transparent" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-red-200 bg-red-50 p-10 text-center shadow-sm dark:border-red-800 dark:bg-red-900/20">
        <svg className="mx-auto mb-3 h-10 w-10 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
        <h2 className="text-lg font-semibold text-red-700 dark:text-red-300">Access Denied</h2>
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">Only admins can access this dashboard.</p>
        <a href="/" className="mt-5 inline-block rounded-lg bg-charcoal-100 px-5 py-2.5 text-sm font-medium text-charcoal-700 transition-colors hover:bg-charcoal-200 dark:bg-charcoal-700 dark:text-charcoal-200 dark:hover:bg-charcoal-600">
          Go to Home
        </a>
      </div>
    );
  }

  if (!adminMode) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-10 text-center shadow-sm dark:border-amber-800 dark:bg-amber-900/20">
        <h2 className="text-lg font-semibold text-amber-700 dark:text-amber-300">Admin features disabled</h2>
        <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">Switch to Admin Mode from the sidebar to access this dashboard.</p>
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

  const filteredMessages = msgFilter === "all" ? recentMessages : recentMessages.filter((m) => m.hobbyTitle === msgFilter);
  const filteredEvents = eventFilter === "all" ? recentEvents : recentEvents.filter((e) => e.hobbyTitle === eventFilter);

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl border border-charcoal-100 bg-charcoal-50/50 p-1 dark:border-charcoal-700 dark:bg-charcoal-800/60">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const badge =
            tab.id === "posts" && pendingPosts.length > 0
              ? pendingPosts.length
              : null;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all sm:text-sm ${
                isActive
                  ? "bg-white text-brand shadow-sm dark:bg-charcoal-700 dark:text-brand-300"
                  : "text-charcoal-400 hover:text-charcoal-600 dark:text-charcoal-500 dark:hover:text-charcoal-300"
              }`}
            >
              <TabIcon icon={tab.icon} className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              {badge && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ═══════════ OVERVIEW TAB ═══════════ */}
      {activeTab === "overview" && (
        <div className="space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total Users" value={users.length} color="brand" />
            <StatCard label="Active" value={users.length - bannedCount} color="green" />
            <StatCard label="Community Leaders" value={leaderCount} color="amber" />
            <StatCard label="Banned" value={bannedCount} color="red" />
          </div>

          {/* Pending posts alert */}
          {pendingPosts.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab("posts")}
              className="flex w-full items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left transition-all hover:shadow-md dark:border-amber-800/60 dark:bg-amber-900/20"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
                <svg className="h-5 w-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                  {pendingPosts.length} post{pendingPosts.length > 1 ? "s" : ""} pending review
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400">Click to review and approve or reject submissions.</p>
              </div>
              <svg className="h-5 w-5 shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          )}

          {/* Quick glance: Recent messages & events */}
          <div className="grid gap-5 lg:grid-cols-2">
            <QuickList
              title="Recent Messages"
              emptyText="No messages yet"
              items={recentMessages.slice(0, 5)}
              renderItem={(msg) => (
                <div key={msg.id} className="min-w-0">
                  <p className="text-xs text-charcoal-400 dark:text-charcoal-500">{msg.authorName} · {msg.hobbyTitle}</p>
                  <p className="mt-0.5 truncate text-sm text-charcoal dark:text-white">{msg.content}</p>
                </div>
              )}
            />
            <QuickList
              title="Recent Events"
              emptyText="No events yet"
              items={recentEvents.slice(0, 5)}
              renderItem={(ev) => (
                <div key={ev.id} className="min-w-0">
                  <p className="text-xs text-charcoal-400 dark:text-charcoal-500">{ev.hobbyTitle} · {formatShortDate(ev.event_date)}</p>
                  <p className="mt-0.5 truncate text-sm font-medium text-charcoal dark:text-white">{ev.title}</p>
                </div>
              )}
            />
          </div>
        </div>
      )}

      {/* ═══════════ USERS TAB ═══════════ */}
      {activeTab === "users" && (
        <div className="space-y-4">
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

          <div className="overflow-hidden rounded-2xl border border-charcoal-100 bg-white shadow-sm dark:border-charcoal-700 dark:bg-charcoal-800/60">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-charcoal-100 bg-charcoal-50/60 dark:border-charcoal-700 dark:bg-charcoal-800/80">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-charcoal-400 dark:text-charcoal-500">User</th>
                    <th className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-wider text-charcoal-400 dark:text-charcoal-500 sm:table-cell">Email</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-charcoal-400 dark:text-charcoal-500">Role</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-charcoal-400 dark:text-charcoal-500">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-charcoal-400 dark:text-charcoal-500">Actions</th>
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
                            <div className="min-w-0">
                              <p className="truncate font-medium text-charcoal dark:text-white">{getDisplayName(user, "Unknown")}</p>
                              <p className="truncate text-xs text-charcoal-400 sm:hidden">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="hidden px-4 py-3 text-charcoal-400 dark:text-charcoal-400 sm:table-cell">{user.email}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            user.role === "admin"
                              ? "bg-brand-50 text-brand dark:bg-brand-900/30 dark:text-brand-300"
                              : user.role === "moderator"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                                : "bg-charcoal-100 text-charcoal-500 dark:bg-charcoal-700 dark:text-charcoal-300"
                          }`}>
                            {user.role === "admin" ? "Admin" : user.role === "moderator" ? "Leader" : "User"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {user.is_banned ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-300">
                              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                              Banned
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
                              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
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
                              {togglingId === user.id ? "…" : user.is_banned ? "Unban" : "Ban"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && (
              <div className="py-12 text-center text-sm text-charcoal-400 dark:text-charcoal-500">No users found.</div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════ POSTS TAB ═══════════ */}
      {activeTab === "posts" && (
        <div className="space-y-5">
          {/* Pending Review */}
          <SectionCard
            title="Pending Review"
            subtitle="Approve or reject community leader submissions"
            badge={pendingPosts.length > 0 ? pendingPosts.length : undefined}
            badgeColor="amber"
          >
            {pendingPosts.length === 0 ? (
              <EmptyState text="No posts waiting for review" icon="check" />
            ) : (
              <ul className="divide-y divide-charcoal-100 dark:divide-charcoal-700">
                {pendingPosts.map((post) => (
                  <li key={post.id} className="p-4">
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-charcoal-400 dark:text-charcoal-500">
                      <span className="font-medium text-charcoal-600 dark:text-charcoal-300">{post.authorName}</span>
                      <span>·</span>
                      <span>{formatShortDate(post.created_at)}</span>
                      {post.hobbyTitle && (
                        <>
                          <span>·</span>
                          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand dark:bg-brand-900/30 dark:text-brand-300">{post.hobbyTitle}</span>
                        </>
                      )}
                    </div>
                    <h4 className="text-sm font-semibold text-charcoal dark:text-white">{post.title}</h4>
                    <p className="mt-1 line-clamp-2 text-sm text-charcoal-500 dark:text-charcoal-400">{post.content}</p>
                    <div className="mt-3 flex gap-2">
                      <button type="button" onClick={() => handleApprovePost(post.id)} disabled={reviewingPostId === post.id}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-green-50 px-3.5 py-1.5 text-xs font-semibold text-green-700 transition-all hover:bg-green-100 disabled:opacity-50 dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-900/40">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                        Approve
                      </button>
                      <button type="button" onClick={() => handleRejectPost(post.id)} disabled={reviewingPostId === post.id}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3.5 py-1.5 text-xs font-semibold text-red-700 transition-all hover:bg-red-100 disabled:opacity-50 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/40">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                        Reject
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          {/* Published */}
          <SectionCard
            title="Published Posts"
            subtitle="Manage published announcements"
            badge={publishedPosts.length > 0 ? publishedPosts.length : undefined}
            badgeColor="brand"
          >
            {publishedPosts.length === 0 ? (
              <EmptyState text="No published posts" icon="doc" />
            ) : (
              <ul className="max-h-[400px] divide-y divide-charcoal-100 overflow-y-auto dark:divide-charcoal-700">
                {publishedPosts.map((post) => (
                  <li key={post.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-charcoal dark:text-white">{post.title}</p>
                      <p className="mt-0.5 text-xs text-charcoal-400 dark:text-charcoal-500">
                        {post.authorName} · {formatShortDate(post.created_at)}
                        {post.hobbyTitle ? ` · ${post.hobbyTitle}` : ""}
                      </p>
                    </div>
                    <button type="button" onClick={() => handleDeletePublishedPost(post.id)} disabled={deletingPostId === post.id}
                      className="shrink-0 rounded-lg p-1.5 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-900/20" title="Delete post">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      )}

      {/* ═══════════ MODERATION TAB ═══════════ */}
      {activeTab === "moderation" && (
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Messages */}
          <SectionCard title="Message Moderation" subtitle="Remove inappropriate content">
            {recentMessages.length === 0 ? (
              <EmptyState text="No messages yet" icon="chat" />
            ) : (
              <>
                <FilterDropdown
                  options={msgCommunities}
                  value={msgFilter}
                  onChange={setMsgFilter}
                  counts={recentMessages.reduce<Record<string, number>>((acc, m) => { acc[m.hobbyTitle] = (acc[m.hobbyTitle] || 0) + 1; return acc; }, {})}
                  total={recentMessages.length}
                  placeholder="Filter by community"
                />
                <ul className="max-h-[500px] divide-y divide-charcoal-100 overflow-y-auto dark:divide-charcoal-700">
                  {filteredMessages.map((msg) => (
                    <li key={msg.id} className="flex items-start justify-between gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-charcoal-400 dark:text-charcoal-500">{msg.authorName} · {msg.hobbyTitle}</p>
                        <p className="mt-0.5 text-sm text-charcoal dark:text-white">{msg.content}</p>
                        <p className="mt-1 text-[10px] text-charcoal-300 dark:text-charcoal-500">{formatShortDate(msg.created_at)} {formatTime(msg.created_at)}</p>
                      </div>
                      <button type="button" onClick={() => handleDeleteMessage(msg.id)} disabled={deletingMessageId === msg.id}
                        className="shrink-0 rounded-lg p-1.5 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-900/20" title="Delete message">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      </button>
                    </li>
                  ))}
                  {filteredMessages.length === 0 && (
                    <li className="py-8 text-center text-sm text-charcoal-400 dark:text-charcoal-500">No messages in this community</li>
                  )}
                </ul>
              </>
            )}
          </SectionCard>

          {/* Events */}
          <SectionCard title="Events Moderation" subtitle="Remove inappropriate events">
            {recentEvents.length === 0 ? (
              <EmptyState text="No events yet" icon="calendar" />
            ) : (
              <>
                <FilterDropdown
                  options={eventCommunities}
                  value={eventFilter}
                  onChange={setEventFilter}
                  counts={recentEvents.reduce<Record<string, number>>((acc, e) => { acc[e.hobbyTitle] = (acc[e.hobbyTitle] || 0) + 1; return acc; }, {})}
                  total={recentEvents.length}
                  placeholder="Filter by community"
                />
                <ul className="max-h-[500px] divide-y divide-charcoal-100 overflow-y-auto dark:divide-charcoal-700">
                  {filteredEvents.map((ev) => (
                    <li key={ev.id} className="flex items-start justify-between gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-charcoal-400 dark:text-charcoal-500">{ev.hobbyTitle}</p>
                        <p className="mt-0.5 text-sm font-medium text-charcoal dark:text-white">{ev.title}</p>
                        <p className="mt-0.5 text-xs text-charcoal-400 dark:text-charcoal-500">{ev.location}</p>
                        <p className="mt-1 text-[10px] text-charcoal-300 dark:text-charcoal-500">{formatShortDate(ev.event_date)} · {ev.status.replace("_", " ")}</p>
                      </div>
                      <button type="button" onClick={() => handleDeleteEvent(ev.id)} disabled={deletingEventId === ev.id}
                        className="shrink-0 rounded-lg p-1.5 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-900/20" title="Delete event">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      </button>
                    </li>
                  ))}
                  {filteredEvents.length === 0 && (
                    <li className="py-8 text-center text-sm text-charcoal-400 dark:text-charcoal-500">No events in this community</li>
                  )}
                </ul>
              </>
            )}
          </SectionCard>
        </div>
      )}
    </div>
  );
}

/* ─── Helper Components ─── */

function StatCard({ label, value, color }: { label: string; value: number; color: "brand" | "green" | "amber" | "red" }) {
  const colors = {
    brand: "from-brand/10 to-brand/5 dark:from-brand/20 dark:to-brand/5",
    green: "from-green-500/10 to-green-500/5 dark:from-green-500/20 dark:to-green-500/5",
    amber: "from-amber-500/10 to-amber-500/5 dark:from-amber-500/20 dark:to-amber-500/5",
    red: "from-red-500/10 to-red-500/5 dark:from-red-500/20 dark:to-red-500/5",
  };
  const textColors = {
    brand: "text-brand dark:text-brand-300",
    green: "text-green-600 dark:text-green-400",
    amber: "text-amber-600 dark:text-amber-400",
    red: "text-red-600 dark:text-red-400",
  };
  return (
    <div className={`rounded-2xl border border-charcoal-100 bg-gradient-to-br p-4 dark:border-charcoal-700 ${colors[color]}`}>
      <p className={`text-2xl font-bold ${textColors[color]}`}>{value}</p>
      <p className="mt-0.5 text-xs font-medium text-charcoal-400 dark:text-charcoal-500">{label}</p>
    </div>
  );
}

function SectionCard({ title, subtitle, badge, badgeColor, children }: {
  title: string; subtitle?: string; badge?: number; badgeColor?: "amber" | "brand"; children: React.ReactNode;
}) {
  const badgeCls = badgeColor === "amber"
    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
    : "bg-brand-50 text-brand dark:bg-brand-900/30 dark:text-brand-300";
  return (
    <div className="overflow-hidden rounded-2xl border border-charcoal-100 bg-white shadow-sm dark:border-charcoal-700 dark:bg-charcoal-800/60">
      <div className="flex items-center justify-between border-b border-charcoal-100 px-4 py-3 dark:border-charcoal-700">
        <div>
          <h3 className="text-sm font-semibold text-charcoal dark:text-white">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-charcoal-400 dark:text-charcoal-500">{subtitle}</p>}
        </div>
        {badge !== undefined && (
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${badgeCls}`}>{badge}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function EmptyState({ text, icon }: { text: string; icon: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-charcoal-50 dark:bg-charcoal-700">
        {icon === "check" ? (
          <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
        ) : icon === "doc" ? (
          <svg className="h-5 w-5 text-charcoal-300 dark:text-charcoal-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
        ) : icon === "chat" ? (
          <svg className="h-5 w-5 text-charcoal-300 dark:text-charcoal-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" /></svg>
        ) : (
          <svg className="h-5 w-5 text-charcoal-300 dark:text-charcoal-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>
        )}
      </div>
      <p className="text-sm text-charcoal-400 dark:text-charcoal-500">{text}</p>
    </div>
  );
}

function QuickList<T>({ title, emptyText, items, renderItem }: {
  title: string; emptyText: string; items: T[]; renderItem: (item: T) => React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-charcoal-100 bg-white shadow-sm dark:border-charcoal-700 dark:bg-charcoal-800/60">
      <div className="border-b border-charcoal-100 px-4 py-3 dark:border-charcoal-700">
        <h3 className="text-sm font-semibold text-charcoal dark:text-white">{title}</h3>
      </div>
      {items.length === 0 ? (
        <div className="py-8 text-center text-sm text-charcoal-400 dark:text-charcoal-500">{emptyText}</div>
      ) : (
        <ul className="divide-y divide-charcoal-100 dark:divide-charcoal-700">
          {items.map((item, i) => (
            <li key={i} className="px-4 py-3">{renderItem(item)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterDropdown({
  options,
  value,
  onChange,
  counts,
  total,
  placeholder,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  counts: Record<string, number>;
  total: number;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = query.trim()
    ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase()))
    : options;

  const label = value === "all" ? `All communities (${total})` : `${value} (${counts[value] || 0})`;

  return (
    <div ref={ref} className="relative border-b border-charcoal-100 px-4 py-2.5 dark:border-charcoal-700">
      <button
        type="button"
        onClick={() => { setOpen((p) => !p); setQuery(""); }}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-charcoal-200 bg-white px-3 py-2 text-left text-sm transition-colors hover:border-charcoal-300 dark:border-charcoal-600 dark:bg-charcoal-800 dark:hover:border-charcoal-500"
      >
        <span className="truncate text-charcoal-700 dark:text-charcoal-200">{label}</span>
        <svg className={`h-4 w-4 shrink-0 text-charcoal-400 transition-transform duration-150 ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-4 right-4 top-full z-30 mt-1 overflow-hidden rounded-xl border border-charcoal-200 bg-white shadow-lg dark:border-charcoal-600 dark:bg-charcoal-800">
          {options.length >= 5 && (
            <div className="border-b border-charcoal-100 p-2 dark:border-charcoal-700">
              <div className="flex items-center gap-2 rounded-lg bg-charcoal-50 px-2.5 py-1.5 dark:bg-charcoal-700/60">
                <svg className="h-3.5 w-3.5 shrink-0 text-charcoal-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search communities..."
                  className="w-full bg-transparent text-xs text-charcoal-700 outline-none placeholder:text-charcoal-400 dark:text-charcoal-200 dark:placeholder:text-charcoal-500"
                />
              </div>
            </div>
          )}
          <ul className="max-h-52 overflow-y-auto py-1">
            <li>
              <button
                type="button"
                onClick={() => { onChange("all"); setOpen(false); }}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors ${
                  value === "all"
                    ? "bg-purple-50 font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                    : "text-charcoal-700 hover:bg-charcoal-50 dark:text-charcoal-200 dark:hover:bg-charcoal-700/60"
                }`}
              >
                All communities
                <span className="rounded-full bg-charcoal-100 px-1.5 py-0.5 text-[10px] font-semibold text-charcoal-600 dark:bg-charcoal-700 dark:text-charcoal-300">{total}</span>
              </button>
            </li>
            {filtered.map((opt) => (
              <li key={opt}>
                <button
                  type="button"
                  onClick={() => { onChange(opt); setOpen(false); }}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors ${
                    value === opt
                      ? "bg-purple-50 font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                      : "text-charcoal-700 hover:bg-charcoal-50 dark:text-charcoal-200 dark:hover:bg-charcoal-700/60"
                  }`}
                >
                  <span className="truncate">{opt}</span>
                  <span className="shrink-0 rounded-full bg-charcoal-100 px-1.5 py-0.5 text-[10px] font-semibold text-charcoal-600 dark:bg-charcoal-700 dark:text-charcoal-300">{counts[opt] || 0}</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-4 text-center text-xs text-charcoal-400 dark:text-charcoal-500">No communities found</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
