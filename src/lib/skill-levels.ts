export const SKILL_LEVELS = ["noob", "skilled", "pro"] as const;

export type SkillLevel = (typeof SKILL_LEVELS)[number];

export const SKILL_LABELS: Record<SkillLevel, string> = {
  noob: "Noob",
  skilled: "Skilled",
  pro: "Pro",
};

export const SKILL_DESCRIPTIONS: Record<SkillLevel, string> = {
  noob: "Just getting started",
  skilled: "Comfortable and improving",
  pro: "Expert — can lead & moderate",
};
