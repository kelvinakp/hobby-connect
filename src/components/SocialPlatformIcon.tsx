"use client";

import type { SocialPlatform } from "@/lib/social-links";

export default function SocialPlatformIcon({
  platform,
  className = "h-3.5 w-3.5",
}: {
  platform: SocialPlatform;
  className?: string;
}) {
  switch (platform) {
    case "facebook":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
          <path d="M13.5 8H16V4.5h-2.5C10.8 4.5 9 6.3 9 9v2H6v3.5h3V21h3.5v-6.5H16L16.5 11H12.5V9c0-.6.4-1 1-1Z" />
        </svg>
      );
    case "instagram":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <rect x="4" y="4" width="16" height="16" rx="4.5" />
          <circle cx="12" cy="12" r="3.5" />
          <circle cx="17" cy="7.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "line":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
          <path d="M12 4C7.03 4 3 7.36 3 11.5c0 3.68 3.22 6.75 7.5 7.37l-.34 2.35c-.04.26.24.46.47.32l2.95-1.8h.42c4.97 0 9-3.36 9-7.5S16.97 4 12 4Zm-4.3 8.15h1.4v3.3H7.7v-3.3Zm3.1 0h1.4v2.05h1.65v1.25h-3.05v-3.3Zm4.05 0h3.05v1.2h-1.65v.35h1.65v1.15h-1.65v.4h1.65v1.2h-3.05v-3.3Z" />
        </svg>
      );
    case "github":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
          <path d="M12 3.5a8.5 8.5 0 0 0-2.7 16.56c.43.08.58-.18.58-.41v-1.44c-2.36.52-2.86-1.01-2.86-1.01-.39-.98-.95-1.24-.95-1.24-.77-.53.06-.52.06-.52.86.06 1.31.88 1.31.88.76 1.3 1.98.93 2.47.71.08-.55.3-.93.54-1.14-1.88-.22-3.85-.94-3.85-4.19 0-.92.33-1.67.87-2.26-.08-.21-.38-1.08.09-2.25 0 0 .71-.23 2.33.86a8.01 8.01 0 0 1 4.24 0c1.62-1.1 2.33-.86 2.33-.86.47 1.17.17 2.04.09 2.25.54.59.87 1.34.87 2.26 0 3.26-1.98 3.96-3.86 4.18.31.27.58.79.58 1.6v2.37c0 .23.16.5.59.41A8.5 8.5 0 0 0 12 3.5Z" />
        </svg>
      );
    case "x":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
          <path d="M18.9 4H21l-6.9 7.88L22 20h-6.2l-4.86-5.96L5.73 20H3.6l7.38-8.43L3.4 4h6.34l4.4 5.45L18.9 4Zm-2.18 14.48h1.73L8.72 5.43H6.86l9.86 13.05Z" />
        </svg>
      );
    case "linkedin":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
          <path d="M5.5 8.4a1.9 1.9 0 1 1 0-3.8 1.9 1.9 0 0 1 0 3.8ZM4 10h3v10H4V10Zm5 0h2.9v1.4h.04c.4-.76 1.4-1.56 2.88-1.56 3.08 0 3.65 2.02 3.65 4.66V20h-3v-4.9c0-1.17-.02-2.67-1.63-2.67-1.63 0-1.88 1.27-1.88 2.58V20H9V10Z" />
        </svg>
      );
    case "youtube":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
          <path d="M21.4 8.2a2.8 2.8 0 0 0-1.97-1.98C17.7 5.75 12 5.75 12 5.75s-5.7 0-7.43.47A2.8 2.8 0 0 0 2.6 8.2 29.6 29.6 0 0 0 2.25 12c0 1.28.12 2.56.35 3.8a2.8 2.8 0 0 0 1.97 1.98c1.73.47 7.43.47 7.43.47s5.7 0 7.43-.47a2.8 2.8 0 0 0 1.97-1.98c.23-1.24.35-2.52.35-3.8 0-1.28-.12-2.56-.35-3.8ZM10 15.25V8.75L15.5 12 10 15.25Z" />
        </svg>
      );
    case "discord":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
          <path d="M19.54 5.5A16.6 16.6 0 0 0 15.4 4.2l-.2.4a15.4 15.4 0 0 1 3.86 1.24c-1.63-1.2-3.45-1.67-5.18-1.84a12.9 12.9 0 0 0-3.76 0c-1.73.17-3.55.64-5.18 1.84A15.4 15.4 0 0 1 8.8 4.6l-.2-.4A16.6 16.6 0 0 0 4.46 5.5C1.8 9.44 1.08 13.27 1.44 17.04a16.8 16.8 0 0 0 5.08 2.56l1.1-1.77a10.8 10.8 0 0 1-1.73-.83l.42-.32c3.33 1.54 6.94 1.54 10.24 0l.42.32c-.56.33-1.14.6-1.73.83l1.1 1.77a16.8 16.8 0 0 0 5.08-2.56c.42-4.39-.72-8.2-3.02-11.54ZM8.94 14.7c-.98 0-1.78-.9-1.78-2s.8-2 1.78-2c.99 0 1.8.9 1.78 2 0 1.1-.8 2-1.78 2Zm6.12 0c-.98 0-1.78-.9-1.78-2s.8-2 1.78-2c.99 0 1.8.9 1.78 2 0 1.1-.79 2-1.78 2Z" />
        </svg>
      );
    case "tiktok":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
          <path d="M14.5 4h2.2c.18 1.52 1.2 2.66 2.8 2.82V9.1c-1.15-.03-2.23-.37-3.2-1v5.98A5.08 5.08 0 1 1 11.2 9v2.36a2.78 2.78 0 1 0 2.72 2.78V4Z" />
        </svg>
      );
    case "website":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" />
          <path d="M3.8 12h16.4M12 3.5c2.5 2.3 2.5 14.7 0 17M12 3.5c-2.5 2.3-2.5 14.7 0 17" />
        </svg>
      );
    default:
      return null;
  }
}
