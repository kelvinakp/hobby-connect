"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSidebar } from "@/components/SidebarContext";
import CreateCommunityModal from "@/components/CreateCommunityModal";

interface MyHobby {
  id: string;
  title: string;
  category: string | null;
  kind: "created" | "joined" | "admin";
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { open, close } = useSidebar();
  const [globalRole, setGlobalRole] = useState<string>("user");
  const [adminMode, setAdminMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("sidebar-admin-mode") === "admin";
  });
  const [loggingOut, setLoggingOut] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [yourCommunities, setYourCommunities] = useState<MyHobby[]>([]);
  const cachedUserCommunitiesRef = useRef<MyHobby[] | null>(null);
  const cachedAdminCommunitiesRef = useRef<MyHobby[] | null>(null);
  const adminModeRef = useRef(adminMode);
  const loadRequestIdRef = useRef(0);

  useEffect(() => {
    adminModeRef.current = adminMode;
  }, [adminMode]);

  const loadCommunities = useCallback(async () => {
    const requestId = ++loadRequestIdRef.current;
    const modeAtStart = adminModeRef.current;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const role = (profile as { role: string } | null)?.role ?? "user";
    setGlobalRole(role);

    if (role === "admin") {
      const cached = modeAtStart
        ? cachedAdminCommunitiesRef.current
        : cachedUserCommunitiesRef.current;
      if (cached) {
        setYourCommunities(cached);
      }
    }

    const list: MyHobby[] = [];

    if (role === "admin" && modeAtStart) {
      const { data: allCommunities } = await supabase
        .from("hobbies")
        .select("id, title, category")
        .order("created_at", { ascending: false });

      if (allCommunities) {
        for (const h of allCommunities as { id: string; title: string; category: string | null }[]) {
          list.push({ ...h, kind: "admin" });
        }
      }

      if (
        requestId !== loadRequestIdRef.current ||
        modeAtStart !== adminModeRef.current
      ) {
        return;
      }

      cachedAdminCommunitiesRef.current = list;
      setYourCommunities(list);
      return;
    }

    const { data: created } = await supabase
      .from("hobbies")
      .select("id, title, category")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });

    if (created) {
      for (const h of created as { id: string; title: string; category: string | null }[]) {
        list.push({ ...h, kind: "created" });
      }
    }

    const { data: joined } = await supabase
      .from("interests")
      .select("hobby_id, hobbies(id, title, category)")
      .eq("user_id", user.id);

    if (joined) {
      const createdIds = new Set(list.map((c) => c.id));
      for (const row of joined as unknown as { hobby_id: string; hobbies: { id: string; title: string; category: string | null } | null }[]) {
        if (row.hobbies && !createdIds.has(row.hobbies.id)) {
          list.push({ id: row.hobbies.id, title: row.hobbies.title, category: row.hobbies.category, kind: "joined" });
        }
      }
    }

    if (
      requestId !== loadRequestIdRef.current ||
      modeAtStart !== adminModeRef.current
    ) {
      return;
    }

    cachedUserCommunitiesRef.current = list;
    setYourCommunities(list);
  }, []);

  useEffect(() => {
    loadCommunities();
  }, [loadCommunities]);

  useEffect(() => {
    if (globalRole !== "admin") return;
    if (typeof window === "undefined") return;
    window.localStorage.setItem("sidebar-admin-mode", adminMode ? "admin" : "user");
    document.cookie = `sidebar-admin-mode=${adminMode ? "admin" : "user"}; path=/; max-age=31536000; samesite=lax`;
  }, [adminMode, globalRole]);

  useEffect(() => {
    let channelRef: ReturnType<typeof createClient>["channel"] extends (...args: infer P) => infer R ? R : never;
    const supabase = createClient();

    async function watchMembershipChanges() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel(`sidebar-interests-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "interests",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            cachedUserCommunitiesRef.current = null;
            void loadCommunities();
          },
        )
        .subscribe();

      channelRef = channel;
    }

    void watchMembershipChanges();

    return () => {
      if (channelRef) {
        supabase.removeChannel(channelRef);
      }
    };
  }, [loadCommunities]);

  useEffect(() => {
    function onMembershipChanged() {
      cachedUserCommunitiesRef.current = null;
      cachedAdminCommunitiesRef.current = null;
      void loadCommunities();
      router.refresh();
    }

    window.addEventListener("community-membership-changed", onMembershipChanged);
    return () => {
      window.removeEventListener("community-membership-changed", onMembershipChanged);
    };
  }, [loadCommunities, router]);

  useEffect(() => {
    close();
  }, [pathname, close]);

  async function handleLogout() {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  function handleCreateClick() {
    close();
    setShowCreateModal(true);
  }

  function handleCreated() {
    cachedUserCommunitiesRef.current = null;
    cachedAdminCommunitiesRef.current = null;
    loadCommunities();
  }

  function handleSetAdminMode(nextMode: boolean) {
    // Switch list immediately from cache when available.
    const cached = nextMode
      ? cachedAdminCommunitiesRef.current
      : cachedUserCommunitiesRef.current;
    if (cached) {
      setYourCommunities(cached);
    }
    setAdminMode(nextMode);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("sidebar-admin-mode", nextMode ? "admin" : "user");
      document.cookie = `sidebar-admin-mode=${nextMode ? "admin" : "user"}; path=/; max-age=31536000; samesite=lax`;
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("admin-mode-changed", {
          detail: { mode: nextMode ? "admin" : "user" },
        }),
      );
    }
    router.refresh();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={close}
      />

      {/* Drawer */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-72 flex-col overflow-hidden bg-white shadow-2xl shadow-charcoal-900/10 transition-transform duration-300 ease-[cubic-bezier(.4,0,.2,1)] dark:bg-charcoal-900 dark:shadow-black/40 lg:sticky lg:top-[4.5rem] lg:z-10 lg:h-[calc(100vh-5rem)] lg:rounded-2xl lg:border lg:border-charcoal-100/80 lg:shadow-sm lg:shadow-charcoal-900/5 lg:dark:border-charcoal-700/60 lg:dark:shadow-black/20 lg:translate-x-0 lg:transition-none ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand header */}
        <div className="flex items-center justify-between px-5 py-5 lg:hidden">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-600 shadow-lg shadow-brand/25">
              <svg className="h-[18px] w-[18px] text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z" />
              </svg>
            </div>
            <h1 className="text-lg font-bold tracking-tight text-charcoal dark:text-white">
              <span className="text-brand">Hobby</span>Connect
            </h1>
          </div>
          <button
            type="button"
            onClick={close}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-charcoal-400 transition-colors hover:bg-charcoal-100 hover:text-charcoal-600 dark:text-charcoal-500 dark:hover:bg-charcoal-700 dark:hover:text-charcoal-200 lg:hidden"
            aria-label="Close sidebar"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex flex-1 flex-col overflow-y-auto px-3 pb-3">
          {/* Main nav */}
          <div className="mb-2 px-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-charcoal-300 dark:text-charcoal-600">Menu</p>
          </div>
          <nav className="mb-3 flex flex-col gap-0.5">
            <NavItem href="/" label="Uni Announcement" pathname={pathname} icon={
              <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 6.948 15.87 4.2c1.66-.826 3.63.383 3.63 2.24v11.12c0 1.858-1.97 3.066-3.63 2.24l-5.53-2.748M10.34 6.948A3.75 3.75 0 0 0 6.75 10.5v3a3.75 3.75 0 0 0 3.59 3.552M10.34 6.948v10.104M6.75 10.5H3.75m3 3H3.75m3 0 1.5 4.5h2.25l-1.5-4.5" />
              </svg>
            } />
            <NavItem href="/profile" label="My Profile" pathname={pathname} icon={
              <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
            } />
            {globalRole === "admin" && adminMode && (
              <NavItem href="/admin" label="Admin" pathname={pathname} icon={
                <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                </svg>
              } badge="ADMIN" />
            )}
          </nav>

          {globalRole === "admin" && (
            <div className="mb-4 rounded-xl border border-charcoal-100 p-2 dark:border-charcoal-700">
              <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-charcoal-300 dark:text-charcoal-600">
                View Mode
              </div>
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => handleSetAdminMode(false)}
                  className={`rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                    !adminMode
                      ? "bg-brand text-white"
                      : "bg-charcoal-50 text-charcoal-500 hover:bg-charcoal-100 dark:bg-charcoal-800 dark:text-charcoal-300 dark:hover:bg-charcoal-700"
                  }`}
                >
                  User Mode
                </button>
                <button
                  type="button"
                  onClick={() => handleSetAdminMode(true)}
                  className={`rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                    adminMode
                      ? "bg-brand text-white"
                      : "bg-charcoal-50 text-charcoal-500 hover:bg-charcoal-100 dark:bg-charcoal-800 dark:text-charcoal-300 dark:hover:bg-charcoal-700"
                  }`}
                >
                  Admin Mode
                </button>
              </div>
            </div>
          )}

          {/* Create Community button */}
          <button
            type="button"
            onClick={handleCreateClick}
            className="mb-5 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand to-brand-600 px-4 py-2.5 text-[13px] font-semibold text-white shadow-md shadow-brand/25 transition-all hover:shadow-lg hover:shadow-brand/30 hover:brightness-110 active:scale-[0.98]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Create Community
          </button>

          {/* Your Communities */}
          <div className="mb-2 flex items-center justify-between px-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-charcoal-300 dark:text-charcoal-600">
              Your Communities
            </p>
            {yourCommunities.length > 0 && (
              <span className="rounded-full bg-charcoal-100 px-1.5 py-0.5 text-[9px] font-bold text-charcoal-400 dark:bg-charcoal-700 dark:text-charcoal-500">
                {yourCommunities.length}
              </span>
            )}
          </div>

          {yourCommunities.length === 0 ? (
            <div className="mb-5 rounded-xl bg-charcoal-50/50 px-3 py-4 text-center dark:bg-charcoal-800/40">
              <p className="text-xs text-charcoal-400 dark:text-charcoal-500">
                No communities yet.
              </p>
              <p className="mt-0.5 text-[10px] text-charcoal-300 dark:text-charcoal-600">
                Create one or join from the feed.
              </p>
            </div>
          ) : (
            <nav className="mb-5 flex flex-col gap-0.5">
              {yourCommunities.map((c) => (
                <Link
                  key={`${c.kind}-${c.id}`}
                  href={`/communities/${c.id}`}
                  className={`group flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all ${
                    pathname === `/communities/${c.id}`
                      ? "bg-brand-50 text-brand dark:bg-brand-500/10 dark:text-brand-300"
                      : "text-charcoal-500 hover:bg-charcoal-50 hover:text-charcoal-700 dark:text-charcoal-400 dark:hover:bg-charcoal-800 dark:hover:text-charcoal-200"
                  }`}
                >
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold transition-colors ${
                    pathname === `/communities/${c.id}`
                      ? "bg-brand/10 text-brand dark:bg-brand-500/20 dark:text-brand-300"
                      : "bg-charcoal-100 text-charcoal-400 group-hover:bg-charcoal-200 group-hover:text-charcoal-600 dark:bg-charcoal-700 dark:text-charcoal-500 dark:group-hover:bg-charcoal-600 dark:group-hover:text-charcoal-300"
                  }`}>
                    {c.title.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{c.title}</span>
                  <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                    c.kind === "created"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                      : c.kind === "joined"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400"
                        : "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400"
                  }`}>
                    {c.kind === "created" ? "Owner" : c.kind === "joined" ? "Joined" : "Admin"}
                  </span>
                </Link>
              ))}
            </nav>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Footer */}
          <div className="border-t border-charcoal-100 pt-3 dark:border-charcoal-800">
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
              </svg>
              {loggingOut ? "Signing out…" : "Sign Out"}
            </button>
            <p className="mt-2 px-3 pb-1 text-[10px] text-charcoal-300 dark:text-charcoal-600">
              HobbyConnect v0.2
            </p>
          </div>
        </div>
      </aside>

      {/* Create Community Modal */}
      <CreateCommunityModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleCreated}
      />
    </>
  );
}

function NavItem({
  href,
  label,
  pathname,
  icon,
  badge,
}: {
  href: string;
  label: string;
  pathname: string;
  icon: React.ReactNode;
  badge?: string;
}) {
  const isActive = pathname === href;
  return (
    <Link
      href={href}
      className={`group flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all ${
        isActive
          ? "bg-brand-50 text-brand dark:bg-brand-500/10 dark:text-brand-300"
          : "text-charcoal-500 hover:bg-charcoal-50 hover:text-charcoal-700 dark:text-charcoal-400 dark:hover:bg-charcoal-800 dark:hover:text-charcoal-200"
      }`}
    >
      <span className={`transition-colors ${isActive ? "text-brand dark:text-brand-300" : "text-charcoal-400 group-hover:text-charcoal-600 dark:text-charcoal-500 dark:group-hover:text-charcoal-300"}`}>
        {icon}
      </span>
      {label}
      {badge && (
        <span className="ml-auto shrink-0 rounded-md bg-brand-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brand dark:bg-brand-500/15 dark:text-brand-300">
          {badge}
        </span>
      )}
    </Link>
  );
}
