/**
 * Shared helpers for displaying user names from profile (first_name + last_name).
 */

export interface ProfileNameLike {
  first_name?: string | null;
  last_name?: string | null;
}

/**
 * Returns a display name from profile: "First Last" or fallback if both are empty.
 */
export function getDisplayName(
  profile: ProfileNameLike | null | undefined,
  fallback = "Unknown"
): string {
  if (!profile) return fallback;
  const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim();
  return name || fallback;
}

/**
 * Returns initials (e.g. "JD") from profile for avatars.
 */
export function getInitials(profile: ProfileNameLike | null | undefined): string {
  if (!profile) return "?";
  if (profile.first_name && profile.last_name) {
    return `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`.toUpperCase();
  }
  const name = getDisplayName(profile, "");
  return name
    .split(" ")
    .map((w) => w.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";
}
