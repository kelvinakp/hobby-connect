/**
 * Fixed locale for date/time formatting so server and client render the same
 * and avoid React hydration mismatches.
 */
export const DATE_LOCALE = "en-US";

export function formatDate(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" }
): string {
  return new Date(date).toLocaleDateString(DATE_LOCALE, options);
}

export function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString(DATE_LOCALE, { hour: "2-digit", minute: "2-digit" });
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString(DATE_LOCALE, { dateStyle: "medium", timeStyle: "short" });
}

export function formatShortDate(date: Date | string): string {
  return new Date(date).toLocaleDateString(DATE_LOCALE, { month: "short", day: "numeric" });
}
