"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";
import {
  useNotifications,
  type Notification,
} from "@/components/NotificationProvider";
import { useSidebar } from "@/components/SidebarContext";
import { useSearch } from "@/components/SearchContext";
import { getCommunitySearchScope } from "@/lib/community-search-scope";
import { createClient } from "@/lib/supabase/client";

interface SearchResult {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
}

export default function Header() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { notifications, unreadCount, markAllRead, clearAll } =
    useNotifications();
  const { toggle } = useSidebar();
  const { query, setQuery, clear } = useSearch();
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [canSearchAllCommunities, setCanSearchAllCommunities] = useState(false);
  const [searchableCommunityIds, setSearchableCommunityIds] = useState<string[]>(
    []
  );
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function loadSearchScope() {
      const supabase = createClient();
      const scope = await getCommunitySearchScope(supabase);
      setCanSearchAllCommunities(scope.canSearchAllCommunities);
      setSearchableCommunityIds(scope.searchableCommunityIds);
    }

    loadSearchScope();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchCommunities = useCallback(async (q: string) => {
    const normalized = q.trim();
    if (normalized.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    if (!canSearchAllCommunities && searchableCommunityIds.length === 0) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const supabase = createClient();
    const pattern = `%${normalized}%`;
    let queryBuilder = supabase
      .from("hobbies")
      .select("id, title, description, category")
      .or(`title.ilike.${pattern},description.ilike.${pattern}`)
      .order("created_at", { ascending: false });

    if (!canSearchAllCommunities) {
      queryBuilder = queryBuilder.in("id", searchableCommunityIds);
    }

    const { data } = await queryBuilder.limit(8);
    setResults((data as SearchResult[]) ?? []);
    setSearching(false);
  }, [canSearchAllCommunities, searchableCommunityIds]);

  useEffect(() => {
    if (!searchFocused) {
      setSearching(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      searchCommunities(query);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, searchCommunities, searchFocused, pathname]);

  function handleNotifToggle() {
    setNotifOpen((prev) => {
      if (!prev) markAllRead();
      return !prev;
    });
  }

  function handleResultClick() {
    setSearchFocused(false);
    clear();
  }

  const showDropdown = searchFocused && query.trim().length >= 2;

  return (
    <header className="fixed left-0 right-0 top-0 z-30">
      <div className="flex h-14 items-center border-b border-charcoal-100/80 bg-white/70 backdrop-blur-xl dark:border-charcoal-700/60 dark:bg-charcoal-900/70">
        <div className="mx-auto grid w-full max-w-[1500px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 sm:px-6 lg:grid-cols-[18rem_minmax(0,1fr)_auto] lg:gap-6 xl:grid-cols-[18rem_minmax(0,1fr)_18rem]">
          {/* Left: menu + logo */}
          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={toggle}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-charcoal-500 transition-colors hover:bg-charcoal-100 hover:text-charcoal dark:text-charcoal-400 dark:hover:bg-charcoal-700 dark:hover:text-white lg:hidden"
              aria-label="Toggle sidebar"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
              </svg>
            </button>

            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-600 shadow-md shadow-brand/20">
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z" />
                </svg>
              </div>
              <h1 className="hidden text-lg font-bold tracking-tight text-charcoal dark:text-white lg:block">
                <span className="text-brand">Hobby</span>Connect
              </h1>
            </div>
          </div>

          {/* Center: search bar */}
          <div ref={searchRef} className="relative w-full max-w-md lg:mx-auto lg:max-w-3xl">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-300 dark:text-charcoal-500"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="text"
              placeholder="Search communities…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              className="block w-full rounded-xl border border-charcoal-200/60 bg-charcoal-50/60 py-2 pl-9 pr-8 text-sm text-charcoal placeholder:text-charcoal-300 transition-all focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-charcoal-700 dark:bg-charcoal-800/50 dark:text-white dark:placeholder:text-charcoal-500 dark:focus:bg-charcoal-800"
            />

            {query && (
              <button
                type="button"
                onClick={clear}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-charcoal-300 transition-colors hover:text-charcoal-500 dark:text-charcoal-500 dark:hover:text-charcoal-300"
                aria-label="Clear search"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            )}

            {/* Search results dropdown */}
            {showDropdown && (
              <div className="absolute left-0 top-full z-50 mt-1.5 w-full overflow-hidden rounded-xl border border-charcoal-100/80 bg-white shadow-2xl shadow-charcoal-900/10 dark:border-charcoal-700 dark:bg-charcoal-800 dark:shadow-black/30">
                {searching ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand border-t-transparent" />
                  </div>
                ) : results.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <p className="text-sm text-charcoal-400 dark:text-charcoal-500">No communities found</p>
                    <p className="mt-0.5 text-xs text-charcoal-300 dark:text-charcoal-600">Try a different keyword</p>
                  </div>
                ) : (
                  <ul className="max-h-72 overflow-y-auto py-1">
                    {results.map((r) => (
                      <li key={r.id}>
                        <Link
                          href={`/communities/${r.id}`}
                          onClick={handleResultClick}
                          className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-charcoal-50 dark:hover:bg-charcoal-700/50"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-brand-400 text-xs font-bold text-white">
                            {r.title.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-charcoal dark:text-white">{r.title}</p>
                            {r.description && (
                              <p className="truncate text-xs text-charcoal-400 dark:text-charcoal-500">{r.description}</p>
                            )}
                          </div>
                          {r.category && (
                            <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand dark:bg-brand-900/30 dark:text-brand-300">
                              {r.category}
                            </span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Right: actions */}
          <div className="flex shrink-0 items-center gap-1 xl:justify-self-end">
            {/* Notification bell */}
            <div ref={dropdownRef} className="relative">
              <button
                type="button"
                onClick={handleNotifToggle}
                aria-label="Notifications"
                className="relative flex h-9 w-9 items-center justify-center rounded-xl text-charcoal-500 transition-colors hover:bg-charcoal-100 hover:text-charcoal dark:text-charcoal-400 dark:hover:bg-charcoal-700 dark:hover:text-white"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-charcoal-900">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 overflow-hidden rounded-2xl border border-charcoal-100/80 bg-white shadow-2xl shadow-charcoal-900/10 dark:border-charcoal-700 dark:bg-charcoal-800 dark:shadow-black/30">
                  <div className="flex items-center justify-between px-4 py-3">
                    <h3 className="text-sm font-bold text-charcoal dark:text-white">Notifications</h3>
                    {notifications.length > 0 && (
                      <button type="button" onClick={clearAll} className="text-xs font-medium text-charcoal-400 transition-colors hover:text-red-500 dark:text-charcoal-500 dark:hover:text-red-400">
                        Clear all
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto border-t border-charcoal-50 dark:border-charcoal-700">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-10 text-center">
                        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-charcoal-50 dark:bg-charcoal-700">
                          <svg className="h-5 w-5 text-charcoal-300 dark:text-charcoal-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                          </svg>
                        </div>
                        <p className="text-xs text-charcoal-400 dark:text-charcoal-500">No notifications yet</p>
                      </div>
                    ) : (
                      <ul className="divide-y divide-charcoal-50 dark:divide-charcoal-700/50">
                        {notifications.map((n) => (
                          <NotificationRow key={n.id} notification={n} />
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-charcoal-500 transition-colors hover:bg-charcoal-100 hover:text-charcoal dark:text-charcoal-400 dark:hover:bg-charcoal-700 dark:hover:text-white"
            >
              {theme === "dark" ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

function NotificationRow({ notification }: { notification: Notification }) {
  const timeAgo = getRelativeTime(notification.createdAt);
  const targetHref =
    notification.type === "message"
      ? `/communities/${notification.hobbyId}?tab=chat`
      : `/communities/${notification.hobbyId}`;

  return (
    <li>
      <Link
        href={targetHref}
        className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-charcoal-50/60 dark:hover:bg-charcoal-700/40"
      >
      {notification.userAvatar ? (
        <Image
          src={notification.userAvatar}
          alt=""
          width={32}
          height={32}
          className="h-8 w-8 shrink-0 rounded-full bg-brand-50 dark:bg-brand-900/30"
          unoptimized
        />
      ) : (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-400 text-xs font-bold text-white">
          {notification.userName.charAt(0)}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs leading-relaxed text-charcoal-600 dark:text-charcoal-200">
          {notification.type === "join" ? (
            <>
              <span className="font-semibold">{notification.userName}</span>{" "}
              joined{" "}
              <span className="font-semibold text-brand dark:text-brand-300">
                {notification.hobbyTitle}
              </span>
            </>
          ) : notification.type === "leave" ? (
            <>
              <span className="font-semibold">{notification.userName}</span>{" "}
              left{" "}
              <span className="font-semibold text-brand dark:text-brand-300">
                {notification.hobbyTitle}
              </span>
            </>
          ) : (
            <>
              <span className="font-semibold">{notification.userName}</span>{" "}
              sent a message in{" "}
              <span className="font-semibold text-brand dark:text-brand-300">
                {notification.hobbyTitle}
              </span>
            </>
          )}
        </p>
        {notification.type === "message" && notification.messagePreview && (
          <p className="mt-0.5 truncate text-[11px] text-charcoal-300 dark:text-charcoal-500">
            "{notification.messagePreview}"
          </p>
        )}
        <p className="mt-0.5 text-[11px] text-charcoal-300 dark:text-charcoal-500" suppressHydrationWarning>
          {timeAgo}
        </p>
      </div>
      </Link>
    </li>
  );
}

function getRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
