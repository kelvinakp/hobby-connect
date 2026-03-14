"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { HOBBY_CATEGORIES } from "@/lib/categories";
import { SKILL_LEVELS, SKILL_LABELS, SKILL_DESCRIPTIONS, type SkillLevel } from "@/lib/skill-levels";

interface Selection {
  category: string;
  skillLevel: SkillLevel;
}

export default function OnboardingForm() {
  const supabase = createClient();
  const router = useRouter();
  const [selections, setSelections] = useState<Selection[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function toggleCategory(cat: string) {
    setSelections((prev) => {
      const exists = prev.find((s) => s.category === cat);
      if (exists) return prev.filter((s) => s.category !== cat);
      return [...prev, { category: cat, skillLevel: "noob" }];
    });
  }

  function setSkillLevel(cat: string, level: SkillLevel) {
    setSelections((prev) =>
      prev.map((s) => (s.category === cat ? { ...s, skillLevel: level } : s))
    );
  }

  function isSelected(cat: string) {
    return selections.some((s) => s.category === cat);
  }

  function getSkillLevel(cat: string): SkillLevel {
    return selections.find((s) => s.category === cat)?.skillLevel ?? "noob";
  }

  async function handleSubmit() {
    if (selections.length === 0) {
      setError("Please select at least one interest.");
      return;
    }

    setError("");
    setSubmitting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be signed in.");
      setSubmitting(false);
      return;
    }

    const rows = selections.map((s) => ({
      user_id: user.id,
      category: s.category,
      skill_level: s.skillLevel,
    }));

    const { error: insertError } = await supabase.from("user_skills").insert(rows);

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    await supabase
      .from("profiles")
      .update({ onboarding_complete: true })
      .eq("id", user.id);

    router.push("/");
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-charcoal-100 bg-white p-6 shadow-lg dark:border-charcoal-700 dark:bg-charcoal-800/80 dark:backdrop-blur-md">
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      <p className="mb-4 text-sm font-medium text-charcoal-600 dark:text-charcoal-200">
        Select your interests and set your skill level for each:
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {HOBBY_CATEGORIES.map((cat) => {
          const selected = isSelected(cat);
          return (
            <div
              key={cat}
              className={`rounded-xl border-2 p-4 transition-all ${
                selected
                  ? "border-brand bg-brand-50/50 dark:border-brand-400 dark:bg-brand-900/20"
                  : "border-charcoal-100 bg-white hover:border-charcoal-200 dark:border-charcoal-700 dark:bg-charcoal-800/40 dark:hover:border-charcoal-600"
              }`}
            >
              <button
                type="button"
                onClick={() => toggleCategory(cat)}
                className="flex w-full items-center justify-between"
              >
                <span className={`text-sm font-semibold ${selected ? "text-brand dark:text-brand-300" : "text-charcoal dark:text-white"}`}>
                  {cat}
                </span>
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all ${
                    selected
                      ? "border-brand bg-brand text-white"
                      : "border-charcoal-300 dark:border-charcoal-500"
                  }`}
                >
                  {selected && (
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  )}
                </div>
              </button>

              {selected && (
                <div className="mt-3 flex gap-2">
                  {SKILL_LEVELS.map((level) => {
                    const active = getSkillLevel(cat) === level;
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setSkillLevel(cat, level)}
                        title={SKILL_DESCRIPTIONS[level]}
                        className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition-all ${
                          active
                            ? level === "pro"
                              ? "bg-amber-500 text-white shadow-md shadow-amber-500/25"
                              : "bg-brand text-white shadow-md shadow-brand/25"
                            : "bg-charcoal-100 text-charcoal-500 hover:bg-charcoal-200 dark:bg-charcoal-700 dark:text-charcoal-300 dark:hover:bg-charcoal-600"
                        }`}
                      >
                        {SKILL_LABELS[level]}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20">
        <p className="text-xs text-amber-700 dark:text-amber-300">
          <strong>Pro</strong> users become community leaders — they can schedule events, moderate chats, and manage community members.
        </p>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-xs text-charcoal-400 dark:text-charcoal-500">
          {selections.length} interest{selections.length !== 1 ? "s" : ""} selected
        </p>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || selections.length === 0}
          className="rounded-lg bg-brand px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand/25 transition-all hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Continue"}
        </button>
      </div>
    </div>
  );
}
