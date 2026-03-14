export interface Skill {
  name: string;
  level: "Noob" | "Skilled" | "Pro";
}

export const SKILL_LEVEL_OPTIONS = ["Noob", "Skilled", "Pro"] as const;

export const SKILL_LEVEL_COLORS: Record<Skill["level"], string> = {
  Noob: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  Skilled: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  Pro: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
};

export const SUGGESTED_SKILLS = [
  "React",
  "TypeScript",
  "Python",
  "Java",
  "C++",
  "JavaScript",
  "Flutter",
  "Node.js",
  "SQL",
  "Figma",
  "Photoshop",
  "Video Editing",
  "3D Modeling",
  "Public Speaking",
  "Writing",
  "Leadership",
  "Project Management",
  "UI/UX Design",
  "Data Analysis",
  "Machine Learning",
];

export const SUGGESTED_HOBBIES = [
  "Music",
  "Movies",
  "Gaming",
  "Anime",
  "Football",
  "Basketball",
  "Badminton",
  "Swimming",
  "Photography",
  "Cooking",
  "Travel",
  "Reading",
  "Fitness",
  "Yoga",
  "Dance",
  "Hiking",
  "Singing",
  "Drawing",
  "Volunteering",
  "Fashion",
];
