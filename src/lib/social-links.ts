export const SOCIAL_PLATFORM_OPTIONS = [
  { id: "facebook", label: "Facebook" },
  { id: "instagram", label: "Instagram" },
  { id: "line", label: "LINE" },
  { id: "github", label: "GitHub" },
  { id: "x", label: "X / Twitter" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "youtube", label: "YouTube" },
  { id: "discord", label: "Discord" },
  { id: "tiktok", label: "TikTok" },
  { id: "website", label: "Website" },
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORM_OPTIONS)[number]["id"];

export interface SocialLinkItem {
  platform: SocialPlatform;
  url: string;
}

export function normalizeSocialUrl(platform: SocialPlatform, rawValue: string): string {
  const value = rawValue.trim();
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;

  if (platform === "line") {
    return value.startsWith("@")
      ? `https://line.me/R/ti/p/${value}`
      : `https://line.me/R/ti/p/~${value}`;
  }

  if (platform === "website") {
    return `https://${value}`;
  }

  const baseMap: Record<SocialPlatform, string> = {
    facebook: "https://facebook.com/",
    instagram: "https://instagram.com/",
    line: "https://line.me/R/ti/p/~",
    github: "https://github.com/",
    x: "https://x.com/",
    linkedin: "https://linkedin.com/in/",
    youtube: "https://youtube.com/@",
    discord: "https://discord.com/users/",
    tiktok: "https://tiktok.com/@",
    website: "https://",
  };

  return `${baseMap[platform]}${value.replace(/^@/, "")}`;
}

export function getSocialMeta(platform: SocialPlatform) {
  return SOCIAL_PLATFORM_OPTIONS.find((p) => p.id === platform) ?? null;
}
