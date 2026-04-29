"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/date-locale";

interface Post {
  id: string;
  title: string;
  content: string;
  status: "PUBLISHED" | "PENDING_REVIEW" | "REJECTED";
  image_url: string | null;
  created_at: string;
}

const PAGE_SIZE = 20;
const MIN_LOADING_MS = 220;

export default function PostsFeed() {
  const supabase = useMemo(() => createClient(), []);
  const [posts, setPosts] = useState<Post[]>([]);
  const [pendingPosts, setPendingPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [contentVisible, setContentVisible] = useState(false);
  const [jumpToPostId, setJumpToPostId] = useState<string | null>(null);
  const [highlightPostId, setHighlightPostId] = useState<string | null>(null);
  const loadStartedAtRef = useRef<number>(Date.now());
  const firstPostCreatedAt = posts[0]?.created_at ?? null;

  async function fetchPostsPage(pageNumber: number) {
    const from = pageNumber * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    return supabase
      .from("posts")
      .select("id, title, content, status, image_url, created_at")
      .eq("status", "PUBLISHED")
      .is("community_id", null)
      .order("created_at", { ascending: false })
      .range(from, to);
  }

  useEffect(() => {
    let mounted = true;
    let revealTimer: ReturnType<typeof setTimeout> | null = null;
    async function load(pageToLoad: number, replace = false) {
      if (replace) {
        loadStartedAtRef.current = Date.now();
        setContentVisible(false);
      }
      const { data, error } = await fetchPostsPage(pageToLoad);

      if (error) {
        console.warn("[PostsFeed] Could not load posts:", error.message);
      }

      if (!mounted) return;
      const incoming = (data as unknown as Post[]) ?? [];
      setPosts((prev) => (replace ? incoming : [...prev, ...incoming]));
      setHasMore(incoming.length === PAGE_SIZE);
      setPage(pageToLoad);
      setLoadingMore(false);

      const elapsed = Date.now() - loadStartedAtRef.current;
      const delay = Math.max(0, MIN_LOADING_MS - elapsed);
      revealTimer = setTimeout(() => {
        if (!mounted) return;
        setLoading(false);
        requestAnimationFrame(() => setContentVisible(true));
      }, delay);
    }

    function onRefresh() {
      setLoading(true);
      setContentVisible(false);
      setLoadingMore(false);
      setHasMore(true);
      setPendingPosts([]);
      void load(0, true);
    }

    void load(0, true);
    window.addEventListener("posts:refresh", onRefresh as EventListener);

    return () => {
      mounted = false;
      if (revealTimer) clearTimeout(revealTimer);
      window.removeEventListener("posts:refresh", onRefresh as EventListener);
    };
  }, [supabase]);

  useEffect(() => {
    if (loading || !firstPostCreatedAt) return;

    let active = true;
    async function checkNewAnnouncements() {
      const { data, error } = await supabase
        .from("posts")
        .select("id, title, content, status, image_url, created_at")
        .eq("status", "PUBLISHED")
        .is("community_id", null)
        .gt("created_at", firstPostCreatedAt)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error || !active) return;
      const incoming = (data as unknown as Post[]) ?? [];
      if (incoming.length === 0) return;

      setPendingPosts((prev) => {
        const prevIds = new Set(prev.map((p) => p.id));
        const merged = [...incoming.filter((p) => !prevIds.has(p.id)), ...prev];
        return merged;
      });
    }

    void checkNewAnnouncements();
    const intervalId = window.setInterval(() => {
      void checkNewAnnouncements();
    }, 20000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [firstPostCreatedAt, loading, supabase]);

  function showNewAnnouncements() {
    if (pendingPosts.length === 0) return;
    setPosts((prev) => {
      const existingIds = new Set(prev.map((p) => p.id));
      const fresh = pendingPosts.filter((p) => !existingIds.has(p.id));
      if (fresh.length > 0) {
        setJumpToPostId(fresh[0].id);
        setHighlightPostId(fresh[0].id);
      }
      return [...fresh, ...prev];
    });
    setPendingPosts([]);
  }

  useEffect(() => {
    if (!jumpToPostId) return;
    const el = document.getElementById(`post-${jumpToPostId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    setJumpToPostId(null);
  }, [jumpToPostId, posts]);

  useEffect(() => {
    if (!highlightPostId) return;
    const timer = window.setTimeout(() => {
      setHighlightPostId(null);
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [highlightPostId]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-charcoal-100 bg-white p-6 dark:border-charcoal-700 dark:bg-charcoal-800/40"
          >
            <div className="flex gap-3">
              <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-charcoal-100 dark:bg-charcoal-700" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-3/4 animate-pulse rounded bg-charcoal-100 dark:bg-charcoal-700" />
                <div className="h-3 w-full animate-pulse rounded bg-charcoal-100 dark:bg-charcoal-700" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-charcoal-100 dark:bg-charcoal-700" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div
        className={`mx-auto w-full max-w-3xl transition-opacity duration-300 ${
          contentVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="rounded-3xl border border-dashed border-charcoal-200 bg-white/70 py-16 text-center shadow-sm backdrop-blur-xl dark:border-charcoal-600 dark:bg-charcoal-800/40">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-900/30">
            <svg className="h-7 w-7 text-brand" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6v-3Z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-charcoal-600 dark:text-charcoal-300">No posts yet</p>
          <p className="mt-1 text-xs text-charcoal-400 dark:text-charcoal-500">
            Check back later for news and announcements.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`mx-auto w-full max-w-3xl space-y-5 transition-opacity duration-300 ${
        contentVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      {pendingPosts.length > 0 && (
        <div className="sticky top-20 z-10 flex justify-center">
          <button
            type="button"
            onClick={showNewAnnouncements}
            className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/95 px-4 py-2 text-xs font-semibold text-brand shadow-lg shadow-brand/10 backdrop-blur-xl transition-all hover:-translate-y-[1px] hover:bg-brand-50 dark:border-brand-700/60 dark:bg-charcoal-800/90 dark:text-brand-300 dark:hover:bg-brand-900/20"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            new Announcement
          </button>
        </div>
      )}
      {posts.map((post) => (
        <PostCard key={post.id} post={post} highlighted={highlightPostId === post.id} />
      ))}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => {
              setLoadingMore(true);
              void (async () => {
                const nextPage = page + 1;
                const { data, error } = await fetchPostsPage(nextPage);

                if (error) {
                  console.warn("[PostsFeed] Could not load more posts:", error.message);
                  setLoadingMore(false);
                  return;
                }

                const incoming = (data as unknown as Post[]) ?? [];
                setPosts((prev) => [...prev, ...incoming]);
                setHasMore(incoming.length === PAGE_SIZE);
                setPage(nextPage);
                setLoadingMore(false);
              })();
            }}
            disabled={loadingMore}
            className="rounded-xl border border-charcoal-200 bg-white px-4 py-2 text-sm font-semibold text-charcoal-600 transition-colors hover:bg-charcoal-50 disabled:opacity-50 dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-charcoal-200 dark:hover:bg-charcoal-700"
          >
            {loadingMore ? "Loading..." : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}

function PostCard({ post, highlighted = false }: { post: Post; highlighted?: boolean }) {
  return (
    <article
      id={`post-${post.id}`}
      className={`rounded-2xl border bg-white/90 p-4 shadow-lg transition-all hover:-translate-y-[1px] hover:shadow-xl dark:bg-charcoal-800/70 dark:backdrop-blur-xl sm:rounded-3xl sm:p-6 ${
        highlighted
          ? "border-brand-300/70 shadow-brand/20 ring-2 ring-brand-200/70 dark:border-brand-500/60 dark:ring-brand-700/40"
          : "border-charcoal-100/80 shadow-charcoal-900/5 hover:shadow-charcoal-900/10 dark:border-charcoal-700/80 dark:shadow-black/25"
      }`}
    >
      <div className="mb-4 text-xs text-charcoal-400 dark:text-charcoal-500">
        <span>{formatDateTime(post.created_at)}</span>
      </div>

      {/* Content */}
      <h3 className="mb-2 text-lg font-bold tracking-tight text-charcoal dark:text-white">{post.title}</h3>
      <p className="whitespace-pre-wrap break-words text-sm leading-7 text-charcoal-500 dark:text-charcoal-300">
        {post.content}
      </p>
      {post.image_url && (
        <div className="relative mt-4 aspect-[16/9] w-full overflow-hidden rounded-xl border border-charcoal-100 dark:border-charcoal-700">
          <Image
            src={post.image_url}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover"
            unoptimized
          />
        </div>
      )}
    </article>
  );
}
