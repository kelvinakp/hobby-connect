"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { HOBBY_CATEGORIES } from "@/lib/categories";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export default function CreateCommunityModal({ open, onClose, onCreated }: Props) {
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setTitle("");
      setDescription("");
      setCategory("");
      setFormError("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError("");

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setFormError("Title is required.");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setFormError("You must be signed in.");
      return;
    }

    setSubmitting(true);

    const { error } = await supabase
      .from("hobbies")
      .insert({
        title: trimmedTitle,
        description: description.trim() || null,
        category: category || null,
        created_by: user.id,
      });

    if (error) {
      setFormError(error.message);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    onCreated?.();
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[3px]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 mx-4 w-full max-w-md animate-[fadeScaleIn_200ms_ease-out] rounded-3xl border border-charcoal-100/80 bg-white/95 p-6 shadow-2xl shadow-charcoal-900/10 backdrop-blur-xl dark:border-charcoal-700/80 dark:bg-charcoal-900/80 dark:shadow-black/40">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-charcoal dark:text-white">
            Create Community
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-charcoal-400 transition-colors hover:bg-charcoal-100 hover:text-charcoal-600 dark:text-charcoal-500 dark:hover:bg-charcoal-700 dark:hover:text-charcoal-200"
            aria-label="Close"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {formError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="modal-title"
              className="mb-1.5 block text-sm font-medium text-charcoal-600 dark:text-charcoal-200"
            >
              Title
            </label>
            <input
              ref={inputRef}
              id="modal-title"
              type="text"
              placeholder="e.g. Python Study Group"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="block w-full rounded-xl border border-charcoal-200 bg-white px-3.5 py-2.5 text-sm text-charcoal placeholder:text-charcoal-300 shadow-sm transition-all focus:-translate-y-[1px] focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15 dark:border-charcoal-600 dark:bg-charcoal-800/80 dark:text-white dark:placeholder:text-charcoal-500"
            />
          </div>

          <div>
            <label
              htmlFor="modal-desc"
              className="mb-1.5 block text-sm font-medium text-charcoal-600 dark:text-charcoal-200"
            >
              Description{" "}
              <span className="font-normal text-charcoal-300 dark:text-charcoal-500">(optional)</span>
            </label>
            <textarea
              id="modal-desc"
              rows={3}
              placeholder="A brief description of the community…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="block w-full resize-none rounded-xl border border-charcoal-200 bg-white px-3.5 py-2.5 text-sm text-charcoal placeholder:text-charcoal-300 shadow-sm transition-all focus:-translate-y-[1px] focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15 dark:border-charcoal-600 dark:bg-charcoal-800/80 dark:text-white dark:placeholder:text-charcoal-500"
            />
          </div>

          <div>
            <label
              htmlFor="modal-cat"
              className="mb-1.5 block text-sm font-medium text-charcoal-600 dark:text-charcoal-200"
            >
              Category
            </label>
            <select
              id="modal-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="block w-full rounded-xl border border-charcoal-200 bg-white px-3.5 py-2.5 text-sm text-charcoal shadow-sm transition-all focus:-translate-y-[1px] focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15 dark:border-charcoal-600 dark:bg-charcoal-800/80 dark:text-white"
            >
              <option value="">Select a category…</option>
              {HOBBY_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand to-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition-all hover:-translate-y-[1px] hover:shadow-xl hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating…
                </>
              ) : (
                "Create"
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-charcoal-500 transition-colors hover:bg-charcoal-100 dark:text-charcoal-400 dark:hover:bg-charcoal-800"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
