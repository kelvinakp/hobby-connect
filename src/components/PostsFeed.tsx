"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/date-locale";

interface Post {
  id: string;
  title: string;
  content: string;
  status: "PUBLISHED" | "PENDING_REVIEW" | "REJECTED";
  image_url: string | null;
  created_at: string;
}

const PAGE_SIZE = 20;

export default function PostsFeed() {
  const supabase = createClient();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  async function fetchPostsPage(pageNumber: number) {
    const from = pageNumber * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    return supabase
      .from("posts")
      .select("id, title, content, status, image_url, created_at")
      .eq("status", "PUBLISHED")
      .order("created_at", { ascending: false })
      .range(from, to);
  }

  useEffect(() => {
    let mounted = true;
    async function load(pageToLoad: number, replace = false) {
      const { data, error } = await fetchPostsPage(pageToLoad);

      if (error) {
        console.warn("[PostsFeed] Could not load posts:", error.message);
      }

      if (!mounted) return;
      const incoming = (data as unknown as Post[]) ?? [];
      setPosts((prev) => (replace ? incoming : [...prev, ...incoming]));
      setHasMore(incoming.length === PAGE_SIZE);
      setPage(pageToLoad);
      setLoading(false);
      setLoadingMore(false);
    }

    function onRefresh() {
      setLoading(true);
      setLoadingMore(false);
      setHasMore(true);
      void load(0, true);
    }

    void load(0, true);
    window.addEventListener("posts:refresh", onRefresh as EventListener);

    return () => {
      mounted = false;
      window.removeEventListener("posts:refresh", onRefresh as EventListener);
    };
  }, [supabase]);

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
      <div className="mx-auto w-full max-w-3xl">
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
    <div className="mx-auto w-full max-w-3xl space-y-5">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
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

function PostCard({ post }: { post: Post }) {
  return (
    <article className="rounded-3xl border border-charcoal-100/80 bg-white/90 p-6 shadow-lg shadow-charcoal-900/5 transition-all hover:-translate-y-[1px] hover:shadow-xl hover:shadow-charcoal-900/10 dark:border-charcoal-700/80 dark:bg-charcoal-800/70 dark:shadow-black/25 dark:backdrop-blur-xl">
      <div className="mb-4 text-xs text-charcoal-400 dark:text-charcoal-500">
        <span>{formatDate(post.created_at)}</span>
      </div>

      {/* Content */}
      <h3 className="mb-2 text-lg font-bold tracking-tight text-charcoal dark:text-white">{post.title}</h3>
      <p className="whitespace-pre-wrap text-sm leading-7 text-charcoal-500 dark:text-charcoal-300">
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
