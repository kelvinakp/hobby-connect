import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#6A0DAD",
          50: "#F3E8FF",
          100: "#E9D5FF",
          200: "#D8B4FE",
          300: "#C084FC",
          400: "#A855F7",
          500: "#6A0DAD",
          600: "#5A0B92",
          700: "#4A0977",
          800: "#3B075C",
          900: "#2B0541",
        },
        charcoal: {
          DEFAULT: "#121212",
          50: "#F5F5F5",
          100: "#E0E0E0",
          200: "#BDBDBD",
          300: "#9E9E9E",
          400: "#757575",
          500: "#616161",
          600: "#424242",
          700: "#303030",
          800: "#212121",
          900: "#121212",
        },
      },
    },
  },
  plugins: [],
};

export default config;
