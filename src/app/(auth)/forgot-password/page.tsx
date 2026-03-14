"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const EMAIL_DOMAIN = "@rsu.ac.th";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    if (!email.trim().toLowerCase().endsWith(EMAIL_DOMAIN)) {
      setError(`Email must end with ${EMAIL_DOMAIN}`);
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: `${window.location.origin}/auth/callback?next=/reset-password` }
      );
      if (err) {
        setError(err.message);
        return;
      }
      setSuccess(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-900/40">
          <svg className="h-7 w-7 text-brand" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
          </svg>
        </div>
        <h2 className="mb-2 text-2xl font-bold text-charcoal dark:text-white">Check your email</h2>
        <p className="mb-6 text-charcoal-400 dark:text-charcoal-300">
          We sent a password reset link to{" "}
          <span className="font-medium text-charcoal dark:text-white">{email}</span>. Click the link to set a new password.
        </p>
        <p className="mb-6 text-xs text-charcoal-400 dark:text-charcoal-500">
          Check your spam folder if you don&apos;t see it.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm font-medium text-brand hover:text-brand-600 dark:text-brand-300 dark:hover:text-brand-200"
        >
          &larr; Back to login
        </Link>
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

      <h2 className="mb-1 text-2xl font-bold text-charcoal dark:text-white">Forgot password?</h2>
      <p className="mb-8 text-charcoal-400 dark:text-charcoal-300">
        Enter your university email and we&apos;ll send you a link to reset your password.
      </p>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-charcoal-600 dark:text-charcoal-200">
            University Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder={`u6601234${EMAIL_DOMAIN}`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="block w-full rounded-lg border border-charcoal-200 bg-white px-3.5 py-2.5 text-sm text-charcoal placeholder:text-charcoal-300 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand dark:border-charcoal-600 dark:bg-charcoal-800 dark:text-white dark:placeholder:text-charcoal-500"
          />
        </div>
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
            "Send reset link"
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
