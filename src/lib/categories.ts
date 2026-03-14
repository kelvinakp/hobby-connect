export const HOBBY_CATEGORIES = [
  "Sports",
  "Tech/Coding",
  "Arts & Music",
  "Study Groups",
  "Science & Research",
  "Languages & Culture",
  "Gaming",
  "Fitness & Wellness",
] as const;

export type HobbyCategory = (typeof HOBBY_CATEGORIES)[number];
