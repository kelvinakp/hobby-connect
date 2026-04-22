"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/date-locale";

interface Event {
  id: string;
  community_id: string;
  creator_id: string;
  title: string;
  location: string;
  event_date: string;
  capacity: number;
  required_skill: "beginner" | "intermediate" | "advanced";
  status: "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "COMPLETED";
  created_at: string;
}

interface Props {
  communityId: string;
  userId: string | null;
  userRole: string | null;
}

const SKILL_OPTIONS = ["beginner", "intermediate", "advanced"] as const;
const STATUS_COLORS: Record<Event["status"], string> = {
  DRAFT: "bg-charcoal-100 text-charcoal-600 dark:bg-charcoal-700 dark:text-charcoal-300",
  PENDING_APPROVAL: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  APPROVED: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  COMPLETED: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
};

export default function EventsTab({ communityId, userId, userRole }: Props) {
  const supabase = createClient();
  const [adminMode, setAdminMode] = useState(true);
  const isMod =
    userRole === "moderator" ||
    (userRole === "admin" && adminMode);

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isBanned, setIsBanned] = useState(false);

  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [capacity, setCapacity] = useState("20");
  const [requiredSkill, setRequiredSkill] = useState<Event["required_skill"]>("beginner");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    function updateModeFromStorage() {
      const modeValue =
        typeof window !== "undefined"
          ? window.localStorage.getItem("sidebar-admin-mode")
          : null;
      setAdminMode(modeValue !== "user");
    }

    updateModeFromStorage();
    window.addEventListener("admin-mode-changed", updateModeFromStorage);
    return () => {
      window.removeEventListener("admin-mode-changed", updateModeFromStorage);
    };
  }, []);

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
        .from("events")
        .select("*")
        .eq("community_id", communityId)
        .order("event_date", { ascending: true });

      if (error) {
        console.warn("[EventsTab] Could not load events:", error.message);
      }

      setEvents((data as Event[]) ?? []);
      setLoading(false);
    }
    load();
  }, [communityId, userId, supabase]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setFormError("");

    if (isBanned) {
      setFormError("Your account has been restricted.");
      return;
    }

    if (!title.trim() || !location.trim() || !eventDate) {
      setFormError("Title, location, and date are required.");
      return;
    }
    if (!userId) return;

    setSubmitting(true);
    const { data, error } = await supabase
      .from("events")
      .insert({
        community_id: communityId,
        creator_id: userId,
        title: title.trim(),
        location: location.trim(),
        event_date: eventDate,
        capacity: Number(capacity) || 20,
        required_skill: requiredSkill,
        status: "APPROVED" as const,
      })
      .select("*")
      .single();

    if (error) {
      if (error.code === "42501" || error.message.includes("policy")) {
        setFormError("Your account has been restricted.");
        setIsBanned(true);
      } else {
        setFormError(error.message);
      }
      setSubmitting(false);
      return;
    }

    setEvents((prev) => [...prev, data as Event]);
    setTitle("");
    setLocation("");
    setEventDate("");
    setCapacity("20");
    setRequiredSkill("beginner");
    setSubmitting(false);
    setShowForm(false);
  }

  async function handleDelete(eventId: string) {
    if (!confirm("Delete this event?")) return;
    await supabase.from("events").delete().eq("id", eventId);
    setEvents((prev) => prev.filter((ev) => ev.id !== eventId));
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col rounded-xl border border-charcoal-100 bg-white dark:border-charcoal-700 dark:bg-charcoal-800/50 dark:backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-charcoal-100 p-4 dark:border-charcoal-700">
        <h3 className="text-sm font-semibold text-charcoal dark:text-white">
          Community Events
        </h3>
        {isMod && (
          <button
            type="button"
            onClick={() => setShowForm((p) => !p)}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-brand/25 transition-all hover:bg-brand-600"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {showForm ? "Cancel" : "Schedule Event"}
          </button>
        )}
      </div>

      {/* Create event form (moderators only) */}
      {isMod && showForm && (
        <div className="border-b border-charcoal-100 p-4 dark:border-charcoal-700">
          {formError && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
              {formError}
            </div>
          )}
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-charcoal-600 dark:text-charcoal-200">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Event title"
                  className="block w-full rounded-lg border border-charcoal-200 bg-white px-3 py-2 text-sm text-charcoal placeholder:text-charcoal-300 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-charcoal-600 dark:bg-charcoal-800 dark:text-white dark:placeholder:text-charcoal-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-charcoal-600 dark:text-charcoal-200">Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Where"
                  className="block w-full rounded-lg border border-charcoal-200 bg-white px-3 py-2 text-sm text-charcoal placeholder:text-charcoal-300 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-charcoal-600 dark:bg-charcoal-800 dark:text-white dark:placeholder:text-charcoal-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-charcoal-600 dark:text-charcoal-200">Date & Time</label>
                <input
                  type="datetime-local"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="block w-full rounded-lg border border-charcoal-200 bg-white px-3 py-2 text-sm text-charcoal focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-charcoal-600 dark:bg-charcoal-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-charcoal-600 dark:text-charcoal-200">Capacity</label>
                <input
                  type="number"
                  min="1"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  className="block w-full rounded-lg border border-charcoal-200 bg-white px-3 py-2 text-sm text-charcoal focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-charcoal-600 dark:bg-charcoal-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-charcoal-600 dark:text-charcoal-200">Skill Level</label>
                <select
                  value={requiredSkill}
                  onChange={(e) => setRequiredSkill(e.target.value as Event["required_skill"])}
                  className="block w-full rounded-lg border border-charcoal-200 bg-white px-3 py-2 text-sm text-charcoal focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-charcoal-600 dark:bg-charcoal-800 dark:text-white"
                >
                  {SKILL_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-md shadow-brand/25 transition-all hover:bg-brand-600 disabled:opacity-50"
            >
              {submitting ? "Creating…" : "Create Event"}
            </button>
          </form>
        </div>
      )}

      {/* Events list */}
      <div className="flex-1 overflow-y-auto p-4">
        {events.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center py-12">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-900/30">
              <svg className="h-6 w-6 text-brand" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
            </div>
            <p className="text-sm font-medium text-charcoal-400 dark:text-charcoal-300">No events scheduled</p>
            <p className="mt-1 text-xs text-charcoal-300 dark:text-charcoal-500">
              {isMod ? "Click \"Schedule Event\" to create one." : "Check back later for upcoming events."}
            </p>
          </div>
        ) : (() => {
          const now = new Date();
          const upcoming = events.filter((ev) => new Date(ev.event_date) >= now);
          const past = events.filter((ev) => new Date(ev.event_date) < now);

          const EventCard = ({ ev, isPast }: { ev: Event; isPast: boolean }) => (
            <div
              className={`group rounded-2xl border border-l-4 p-4 transition-all hover:shadow-md ${
                isPast
                  ? "border-l-charcoal-300 border-charcoal-100 bg-charcoal-50/50 dark:border-l-charcoal-600 dark:border-charcoal-700 dark:bg-charcoal-800/30"
                  : "border-l-brand border-charcoal-100 bg-white shadow-sm dark:border-charcoal-700 dark:bg-charcoal-800/60 dark:border-l-brand"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className={`text-sm font-semibold ${isPast ? "text-charcoal-400 dark:text-charcoal-500" : "text-charcoal dark:text-white"}`}>
                      {ev.title}
                    </h4>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[ev.status]}`}>
                      {ev.status.replace("_", " ")}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-charcoal-500 dark:text-charcoal-400">
                    <span className="flex items-center gap-1">
                      <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                      </svg>
                      {ev.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                      </svg>
                      {formatDateTime(ev.event_date)}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                      </svg>
                      {ev.capacity} spots
                    </span>
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand dark:bg-brand-900/30 dark:text-brand-300">
                      {ev.required_skill}
                    </span>
                  </div>
                </div>
                {isMod && (
                  <button
                    type="button"
                    onClick={() => handleDelete(ev.id)}
                    className="shrink-0 rounded-md p-1.5 text-red-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-900/30"
                    title="Delete event"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          );

          return (
            <div className="space-y-6">
              {upcoming.length > 0 && (
                <section>
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-charcoal-400 dark:text-charcoal-500">
                    Upcoming
                  </h4>
                  <div className="space-y-3">
                    {upcoming.map((ev) => (
                      <EventCard key={ev.id} ev={ev} isPast={false} />
                    ))}
                  </div>
                </section>
              )}
              {past.length > 0 && (
                <section>
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-charcoal-400 dark:text-charcoal-500">
                    Past
                  </h4>
                  <div className="space-y-3">
                    {past.map((ev) => (
                      <EventCard key={ev.id} ev={ev} isPast />
                    ))}
                  </div>
                </section>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
