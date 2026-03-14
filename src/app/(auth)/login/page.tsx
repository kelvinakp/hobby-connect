"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/PasswordInput";

interface FieldErrors {
  email?: string;
  password?: string;
}

const EMAIL_DOMAIN = "@rsu.ac.th";

function validate(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};

  if (!email.trim()) {
    errors.email = "Email is required.";
  } else if (!email.trim().toLowerCase().endsWith(EMAIL_DOMAIN)) {
    errors.email = `Email must end with ${EMAIL_DOMAIN}`;
  }

  if (!password) {
    errors.password = "Password is required.";
  }

  return errors;
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const isBanned = searchParams.get("banned") === "1";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError("");

    const fieldErrors = validate(email, password);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setLoading(true);

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        setServerError(error.message);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setServerError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Mobile branding */}
      <div className="mb-8 flex items-center gap-3 lg:hidden">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white">
          <span className="text-lg font-bold">H</span>
        </div>
        <span className="text-xl font-semibold text-charcoal dark:text-white">
          HobbyConnect
        </span>
      </div>

      <h2 className="mb-1 text-2xl font-bold text-charcoal dark:text-white">
        Welcome back
      </h2>
      <p className="mb-8 text-charcoal-400 dark:text-charcoal-300">
        Sign in with your Rangsit University email.
      </p>

      {isBanned && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
          Your account has been restricted by a moderator. If you believe this is a mistake, please contact support.
        </div>
      )}

      {serverError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-sm font-medium text-charcoal-600 dark:text-charcoal-200"
          >
            University Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder={`u6601234${EMAIL_DOMAIN}`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
            className={`block w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-charcoal placeholder:text-charcoal-300 transition-colors focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand dark:bg-charcoal-800 dark:text-white dark:placeholder:text-charcoal-500 ${
              errors.email
                ? "border-red-400 dark:border-red-600"
                : "border-charcoal-200 dark:border-charcoal-600"
            }`}
          />
          {errors.email && (
            <p
              id="email-error"
              role="alert"
              className="mt-1.5 text-xs text-red-600 dark:text-red-400"
            >
              {errors.email}
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-sm font-medium text-charcoal-600 dark:text-charcoal-200">Password</span>
            <Link
              href="/forgot-password"
              tabIndex={-1}
              className="text-xs font-medium text-brand hover:text-brand-600 dark:text-brand-300 dark:hover:text-brand-200"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="password"
            label=""
            placeholder="Enter your password"
            value={password}
            onChange={setPassword}
            error={errors.password}
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "password-error" : undefined}
            className={errors.password ? "border-red-400 dark:border-red-600" : ""}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition-all hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:ring-offset-charcoal"
        >
          {loading ? (
            <>
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-charcoal-400 dark:text-charcoal-300">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-medium text-brand hover:text-brand-600 dark:text-brand-300 dark:hover:text-brand-200"
        >
          Create account
        </Link>
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  );
}
