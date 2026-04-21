"use client";

import { useState } from "react";

interface PasswordInputProps {
  id: string;
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  minLength?: number;
  autoComplete?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  className?: string;
}

export function PasswordInput({
  id,
  label,
  placeholder,
  value,
  onChange,
  error,
  minLength,
  autoComplete,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedby,
  className = "",
}: PasswordInputProps) {
  const [show, setShow] = useState(false);

  const inputClass = `block w-full rounded-xl border bg-white py-2.5 pr-11 pl-3.5 text-sm text-charcoal placeholder:text-charcoal-300 shadow-sm transition-all focus:-translate-y-[1px] focus:outline-none focus:ring-4 focus:ring-brand/15 focus:border-brand dark:bg-charcoal-800/80 dark:text-white dark:placeholder:text-charcoal-500 ${
    error ? "border-red-400 dark:border-red-600" : "border-charcoal-200 dark:border-charcoal-600"
  } ${className}`;

  return (
    <div>
      {label ? (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-charcoal-600 dark:text-charcoal-200">
          {label}
        </label>
      ) : null}
      <div className="relative">
        <input
          id={id}
          name={id}
          type={show ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          minLength={minLength}
          aria-invalid={ariaInvalid ?? !!error}
          aria-describedby={ariaDescribedby ?? (error ? `${id}-error` : undefined)}
          className={inputClass}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1.5 text-charcoal-400 transition-colors hover:bg-charcoal-100 hover:text-charcoal-600 dark:hover:bg-charcoal-700 dark:hover:text-charcoal-300"
          aria-label={show ? "Hide password" : "Show password"}
          tabIndex={-1}
        >
          {show ? (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.228 3.228m3.228 11.544-3.228-3.228M3 3l3.228 3.228M3 3l3.228 3.228m0 0 3.228 3.228M3 3l3.228 3.228m9.544 0 3.228-3.228M21 21l-3.228-3.228m0 0-3.228 3.228M21 21l-3.228-3.228m0 0-3.228-3.228" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
          )}
        </button>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
