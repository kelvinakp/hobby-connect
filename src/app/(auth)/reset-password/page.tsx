"use client";

import { useState, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/PasswordInput";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session);
      setChecking(false);
    });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) {
        setError(err.message);
        return;
      }
      setSuccess(true);
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 2000);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="text-center">
        <p className="mb-6 text-charcoal-600 dark:text-charcoal-300">
          Your reset link may have expired. Please request a new one.
        </p>
        <Link
          href="/forgot-password"
          className="inline-flex font-medium text-brand hover:text-brand-600 dark:text-brand-300"
        >
          Request new reset link
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/30">
          <svg className="h-7 w-7 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>
        <h2 className="mb-2 text-2xl font-bold text-charcoal dark:text-white">Password updated</h2>
        <p className="mb-6 text-charcoal-400 dark:text-charcoal-300">
          Redirecting you to the app…
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8 flex items-center gap-3 lg:hidden">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white">
          <span className="text-lg font-bold">H</span>
        </div>
        <span className="text-xl font-semibold text-charcoal dark:text-white">HobbyConnect</span>
      </div>

      <h2 className="mb-1 text-2xl font-bold text-charcoal dark:text-white">Set new password</h2>
      <p className="mb-8 text-charcoal-400 dark:text-charcoal-300">
        Enter your new password below.
      </p>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <PasswordInput
          id="password"
          label="New password"
          placeholder="At least 8 characters"
          value={password}
          onChange={setPassword}
          minLength={8}
        />
        <PasswordInput
          id="confirmPassword"
          label="Confirm new password"
          placeholder="Re-enter password"
          value={confirmPassword}
          onChange={setConfirmPassword}
        />
        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:ring-offset-charcoal"
        >
          {loading ? (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            "Update password"
          )}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-charcoal-400 dark:text-charcoal-300">
        <Link href="/login" className="font-medium text-brand hover:text-brand-600 dark:text-brand-300 dark:hover:text-brand-200">
          &larr; Back to login
        </Link>
      </p>
    </>
  );
}
