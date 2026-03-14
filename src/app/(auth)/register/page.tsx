"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/PasswordInput";

interface FieldErrors {
  studentId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

const EMAIL_DOMAIN = "@rsu.ac.th";

function validate(fields: {
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}): FieldErrors {
  const errors: FieldErrors = {};

  if (!fields.studentId.trim()) {
    errors.studentId = "Student ID is required.";
  } else if (!/^\d{7,10}$/.test(fields.studentId.trim())) {
    errors.studentId = "Student ID must be 7-10 digits.";
  }

  if (!fields.firstName.trim()) {
    errors.firstName = "First name is required.";
  }

  if (!fields.lastName.trim()) {
    errors.lastName = "Last name is required.";
  }

  if (!fields.email.trim()) {
    errors.email = "University email is required.";
  } else if (!fields.email.trim().toLowerCase().endsWith(EMAIL_DOMAIN)) {
    errors.email = `Email must end with ${EMAIL_DOMAIN}`;
  }

  if (!fields.password) {
    errors.password = "Password is required.";
  } else if (fields.password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  }

  if (!fields.confirmPassword) {
    errors.confirmPassword = "Please confirm your password.";
  } else if (fields.password !== fields.confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
}

export default function RegisterPage() {
  const [studentId, setStudentId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError("");

    const fieldErrors = validate({
      studentId,
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
    });

    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setLoading(true);

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            student_id: studentId.trim(),
            first_name: firstName.trim(),
            last_name: lastName.trim(),
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setServerError(error.message);
        return;
      }

      setSuccess(true);
    } catch {
      setServerError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendConfirmation() {
    setResendMessage(null);
    setResending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim().toLowerCase(),
      });
      if (error) {
        setResendMessage({ type: "error", text: error.message });
      } else {
        setResendMessage({ type: "success", text: "Confirmation email sent again. Check your inbox and spam folder." });
      }
    } catch {
      setResendMessage({ type: "error", text: "Could not resend. Please try again." });
    } finally {
      setResending(false);
    }
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-900/40">
          <svg
            className="h-7 w-7 text-brand"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
            />
          </svg>
        </div>
        <h2 className="mb-2 text-2xl font-bold text-charcoal dark:text-white">
          Check your email
        </h2>
        <p className="mb-3 text-charcoal-400 dark:text-charcoal-300">
          We sent a confirmation link to{" "}
          <span className="font-medium text-charcoal dark:text-white">
            {email}
          </span>
          . Click the link to activate your account.
        </p>
        <p className="mb-6 text-xs text-charcoal-400 dark:text-charcoal-500">
          Not seeing it? Check your <strong>spam or junk</strong> folder. University emails sometimes block or delay these messages. You can try resending below.
        </p>
        {resendMessage && (
          <p
            className={`mb-4 text-sm ${
              resendMessage.type === "success"
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {resendMessage.text}
          </p>
        )}
        <div className="mb-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={handleResendConfirmation}
            disabled={resending}
            className="text-sm font-medium text-brand hover:text-brand-600 disabled:opacity-50 dark:text-brand-300 dark:hover:text-brand-200"
          >
            {resending ? "Sending…" : "Resend confirmation email"}
          </button>
          <span className="hidden text-charcoal-300 sm:inline">·</span>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-medium text-brand hover:text-brand-600 dark:text-brand-300 dark:hover:text-brand-200"
          >
            Back to login
          </Link>
        </div>
      </div>
    );
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
        Create your account
      </h2>
      <p className="mb-8 text-charcoal-400 dark:text-charcoal-300">
        Use your Rangsit University email to get started.
      </p>

      {serverError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Student ID */}
        <Field
          id="studentId"
          label="Student ID"
          placeholder="e.g. 6601234"
          value={studentId}
          onChange={setStudentId}
          error={errors.studentId}
          inputMode="numeric"
        />

        {/* Name row */}
        <div className="grid grid-cols-2 gap-4">
          <Field
            id="firstName"
            label="First Name"
            placeholder="Somchai"
            value={firstName}
            onChange={setFirstName}
            error={errors.firstName}
          />
          <Field
            id="lastName"
            label="Last Name"
            placeholder="Suksai"
            value={lastName}
            onChange={setLastName}
            error={errors.lastName}
          />
        </div>

        {/* Email */}
        <Field
          id="email"
          label="University Email"
          type="email"
          placeholder={`u6601234${EMAIL_DOMAIN}`}
          value={email}
          onChange={setEmail}
          error={errors.email}
        />

        {/* Password */}
        <PasswordInput
          id="password"
          label="Password"
          placeholder="At least 8 characters"
          value={password}
          onChange={setPassword}
          error={errors.password}
          minLength={8}
          autoComplete="new-password"
        />

        {/* Confirm Password */}
        <PasswordInput
          id="confirmPassword"
          label="Confirm Password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          error={errors.confirmPassword}
          autoComplete="new-password"
        />

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition-all hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:ring-offset-charcoal"
        >
          {loading ? (
            <>
              <Spinner />
              Creating account…
            </>
          ) : (
            "Create account"
          )}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-charcoal-400 dark:text-charcoal-300">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-brand hover:text-brand-600 dark:text-brand-300 dark:hover:text-brand-200"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}

/* ─── Reusable field ─── */

function Field({
  id,
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  error,
  inputMode,
}: {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  inputMode?: "numeric" | "text" | "email";
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-charcoal-600 dark:text-charcoal-200"
      >
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        inputMode={inputMode}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`block w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-charcoal placeholder:text-charcoal-300 transition-colors focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand dark:bg-charcoal-800 dark:text-white dark:placeholder:text-charcoal-500 ${
          error
            ? "border-red-400 dark:border-red-600"
            : "border-charcoal-200 dark:border-charcoal-600"
        }`}
      />
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1.5 text-xs text-red-600 dark:text-red-400"
        >
          {error}
        </p>
      )}
    </div>
  );
}

/* ─── Spinner ─── */

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
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
  );
}
