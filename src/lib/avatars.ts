const SEEDS = [
  "Felix",
  "Luna",
  "Orion",
  "Milo",
  "Nova",
  "Coco",
  "Ziggy",
  "Pixel",
  "Bolt",
  "Echo",
  "Rumi",
  "Jade",
] as const;

export const PRESET_AVATARS = SEEDS.map(
  (seed) => `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`
);

export const DEFAULT_AVATAR = PRESET_AVATARS[0];
