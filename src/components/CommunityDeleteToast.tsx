"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function CommunityDeleteToast() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  const shouldShow = useMemo(
    () => searchParams.get("communityDeleted") === "1",
    [searchParams]
  );

  useEffect(() => {
    if (!shouldShow) return;

    setMounted(true);
    const raf = window.requestAnimationFrame(() => {
      setVisible(true);
    });

    const params = new URLSearchParams(searchParams.toString());
    params.delete("communityDeleted");
    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(nextUrl, { scroll: false });

    return () => window.cancelAnimationFrame(raf);
  }, [pathname, router, searchParams, shouldShow]);

  useEffect(() => {
    if (!visible) return;
    const hideTimer = window.setTimeout(() => {
      setVisible(false);
    }, 2000);
    return () => window.clearTimeout(hideTimer);
  }, [visible]);

  useEffect(() => {
    if (visible || !mounted) return;
    const unmountTimer = window.setTimeout(() => {
      setMounted(false);
    }, 280);
    return () => window.clearTimeout(unmountTimer);
  }, [mounted, visible]);

  if (!mounted) return null;

  return (
    <div
      className={`mx-auto mb-6 max-w-3xl transition-all duration-300 ${
        visible
          ? "translate-y-0 opacity-100"
          : "-translate-y-1 opacity-0"
      }`}
    >
      <div className="flex items-start gap-3 rounded-2xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50 to-white px-4 py-3 shadow-sm ring-1 ring-emerald-100/70 backdrop-blur-xl dark:border-emerald-800/60 dark:from-emerald-900/20 dark:to-charcoal-800/60 dark:ring-emerald-900/30">
        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
            Community deleted successfully.
          </p>
          <p className="mt-0.5 text-xs text-emerald-700/90 dark:text-emerald-400/90">
            Your community list has been updated.
          </p>
        </div>
      </div>
    </div>
  );
}
