"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { getDisplayName, getInitials } from "@/lib/display-name";
import { formatTime } from "@/lib/date-locale";

interface Message {
  id: string;
  community_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface Props {
  communityId: string;
  userId: string | null;
  userRole: string | null;
}

export default function CommunityChat({ communityId, userId, userRole }: Props) {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [banningId, setBanningId] = useState<string | null>(null);
  const [isBanned, setIsBanned] = useState(false);
  const [sendError, setSendError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const profileCacheRef = useRef<Map<string, Message["profiles"]>>(new Map());

  const isMod = userRole === "admin" || userRole === "moderator";

  useEffect(() => {
    async function load() {
      if (userId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_banned")
          .eq("id", userId)
          .single();
        if ((profile as { is_banned: boolean } | null)?.is_banned) {
          setIsBanned(true);
        }
      }

      const { data, error } = await supabase
        .from("messages")
        .select("id, community_id, user_id, content, created_at")
        .eq("community_id", communityId)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) {
        console.warn("[CommunityChat] Could not load messages:", error.message);
      }

      const rows =
        (data as {
          id: string;
          community_id: string;
          user_id: string;
          content: string;
          created_at: string;
        }[] | null) ?? [];
      const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
      const profileMap = new Map<string, Message["profiles"]>();
      if (userIds.length > 0) {
        const { data: pp } = await supabase
          .from("public_profiles")
          .select("id, first_name, last_name, avatar_url")
          .in("id", userIds);
        (pp as { id: string; first_name: string | null; last_name: string | null; avatar_url: string | null }[] | null)?.forEach(
          (p) => {
            const profile = {
              first_name: p.first_name,
              last_name: p.last_name,
              avatar_url: p.avatar_url,
            };
            profileMap.set(p.id, profile);
            profileCacheRef.current.set(p.id, profile);
          }
        );
      }
      const initial: Message[] = rows
        .map((r) => ({
          ...r,
          profiles: profileMap.get(r.user_id) ?? null,
        }))
        .reverse();
      setMessages(initial);
      setLoading(false);
    }
    load();
  }, [communityId, userId, supabase]);

  useEffect(() => {
    const channel = supabase
      .channel(`community-chat-${communityId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `community_id=eq.${communityId}`,
        },
        async (payload) => {
          const record = payload.new as Record<string, string>;
          let profile = profileCacheRef.current.get(record.user_id) ?? null;
          if (!profile) {
            const { data } = await supabase
              .from("public_profiles")
              .select("id, first_name, last_name, avatar_url")
              .eq("id", record.user_id)
              .single();
            profile = data
              ? {
                  first_name: (data as { first_name: string | null }).first_name,
                  last_name: (data as { last_name: string | null }).last_name,
                  avatar_url: (data as { avatar_url: string | null }).avatar_url,
                }
              : null;
            if (profile) profileCacheRef.current.set(record.user_id, profile);
          }

          const msg: Message = {
            id: record.id,
            community_id: record.community_id,
            user_id: record.user_id,
            content: record.content,
            created_at: record.created_at,
            profiles: profile,
          };

          setMessages((prev) => [...prev, msg]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
          filter: `community_id=eq.${communityId}`,
        },
        (payload) => {
          const old = payload.old as { id: string };
          setMessages((prev) => prev.filter((m) => m.id !== old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [communityId, supabase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    setSendError("");
    const text = newMsg.trim();
    if (!text || !userId) return;

    if (isBanned) {
      setSendError("Your account has been restricted.");
      return;
    }

    setSending(true);
    const { error } = await supabase.from("messages").insert({
      community_id: communityId,
      user_id: userId,
      content: text,
    });

    if (error) {
      if (error.code === "42501" || error.message.includes("policy")) {
        setSendError("Your account has been restricted.");
        setIsBanned(true);
      } else {
        setSendError(error.message);
      }
      setSending(false);
      return;
    }

    setNewMsg("");
    setSending(false);
  }

  async function handleDeleteMessage(msgId: string) {
    await supabase.from("messages").delete().eq("id", msgId);
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
  }

  async function handleBanUser(targetUserId: string) {
    if (!confirm("Ban this user? They will no longer be able to post messages.")) return;
    setBanningId(targetUserId);
    await supabase.from("profiles").update({ is_banned: true }).eq("id", targetUserId);
    setBanningId(null);
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-charcoal-100 bg-white dark:border-charcoal-700 dark:bg-charcoal-800/50 dark:backdrop-blur-sm">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto scroll-smooth p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-900/30">
              <svg className="h-6 w-6 text-brand" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-charcoal-400 dark:text-charcoal-300">No messages yet</p>
            <p className="mt-1 text-xs text-charcoal-300 dark:text-charcoal-500">Be the first to say something!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => {
              const isOwn = msg.user_id === userId;
              const initials = getInitials(msg.profiles);
              return (
                <div key={msg.id} className={`group/msg flex ${isOwn ? "justify-end" : "justify-start"}`}>
                  {/* Avatar (other users only) */}
                  {!isOwn && (
                    <div className="mr-2 shrink-0 pt-1">
                      <Link href={`/users/${msg.user_id}`} className="block">
                        {msg.profiles?.avatar_url ? (
                          <Image
                            src={msg.profiles.avatar_url}
                            alt={getDisplayName(msg.profiles, "Student")}
                            width={28}
                            height={28}
                            className="h-7 w-7 rounded-full bg-brand-50 dark:bg-brand-900/30"
                            unoptimized
                          />
                        ) : (
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-[10px] font-semibold text-brand dark:bg-brand-900/30 dark:text-brand-300">
                            {initials}
                          </span>
                        )}
                      </Link>
                    </div>
                  )}

                  <div className="relative max-w-[75%]">
                    <div
                      className={`rounded-2xl px-4 py-2.5 shadow-sm ${
                        isOwn
                          ? "rounded-br-md bg-brand text-white shadow-brand/20"
                          : "rounded-bl-md border border-charcoal-100 bg-white text-charcoal dark:border-charcoal-600 dark:bg-charcoal-700 dark:text-white"
                      }`}
                    >
                      <p className={`mb-0.5 text-xs font-semibold ${isOwn ? "text-white/90" : "text-brand dark:text-brand-300"}`}>
                        {isOwn ? "You" : (
                          <Link
                            href={`/users/${msg.user_id}`}
                            className="hover:underline"
                          >
                            {getDisplayName(msg.profiles, "Unknown")}
                          </Link>
                        )}
                      </p>
                      <p className="text-sm leading-relaxed">
                        {msg.content}
                      </p>
                      <p className={`mt-1 text-[10px] ${isOwn ? "text-white/70" : "text-charcoal-400 dark:text-charcoal-500"}`}>
                        {formatTime(msg.created_at)}
                      </p>
                    </div>

                    {/* Moderator actions */}
                    {isMod && !isOwn && (
                      <div className="absolute -right-20 top-0 hidden items-center gap-1 group-hover/msg:flex">
                        <button
                          type="button"
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="rounded-md p-1.5 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30"
                          title="Delete message"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleBanUser(msg.user_id)}
                          disabled={banningId === msg.user_id}
                          className="rounded-md p-1.5 text-orange-400 transition-colors hover:bg-orange-50 hover:text-orange-600 disabled:opacity-50 dark:hover:bg-orange-900/30"
                          title="Ban user"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Banned / error banner */}
      {sendError && (
        <div className="shrink-0 border-t border-red-200 bg-red-50 px-4 py-2.5 text-center text-sm font-medium text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
          {sendError}
        </div>
      )}

      {/* Input area */}
      {userId && !isBanned ? (
        <form onSubmit={handleSend} className="flex shrink-0 items-center gap-3 border-t border-charcoal-100 p-4 dark:border-charcoal-700">
          <input
            type="text"
            value={newMsg}
            onChange={(e) => setNewMsg(e.target.value)}
            placeholder="Type a message…"
            className="flex-1 rounded-lg border border-charcoal-200 bg-charcoal-50 px-4 py-2.5 text-sm text-charcoal placeholder:text-charcoal-300 transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-charcoal-600 dark:bg-charcoal-800 dark:text-white dark:placeholder:text-charcoal-500"
          />
          <button
            type="submit"
            disabled={!newMsg.trim() || sending}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand text-white shadow-md shadow-brand/25 transition-all hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Send message"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
            </svg>
          </button>
        </form>
      ) : isBanned ? (
        <div className="shrink-0 border-t border-red-200 bg-red-50 p-4 text-center text-sm font-medium text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
          Your account has been restricted.
        </div>
      ) : (
        <div className="shrink-0 border-t border-charcoal-100 p-4 text-center text-sm text-charcoal-400 dark:border-charcoal-700 dark:text-charcoal-500">
          Sign in to send messages
        </div>
      )}
    </div>
  );
}
