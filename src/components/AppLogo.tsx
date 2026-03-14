import Link from "next/link";

const FlameIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z"
    />
  </svg>
);

interface AppLogoProps {
  /** "light" = charcoal/brand text (light bg), "dark" = white text (purple panel) */
  variant?: "light" | "dark";
  /** Icon size: "sm" (header/sidebar), "md" (auth mobile / standalone) */
  size?: "sm" | "md";
  /** Wrap in Link to "/" when true (e.g. auth layout) */
  link?: boolean;
  /** Optional class for the wrapper */
  className?: string;
}

export default function AppLogo({
  variant = "light",
  size = "sm",
  link = false,
  className = "",
}: AppLogoProps) {
  const iconSize = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const svgSize = size === "sm" ? "h-4 w-4" : "h-[18px] w-[18px]";
  const textSize = size === "sm" ? "text-lg" : "text-xl";

  const content = (
    <div className={`flex items-center gap-2.5 ${link ? "" : className}`}>
      <div
        className={`flex ${iconSize} items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-600 shadow-lg shadow-brand/25 ${size === "md" ? "shadow-md" : ""}`}
      >
        <FlameIcon className={`${svgSize} text-white`} />
      </div>
      <span
        className={`${textSize} font-bold tracking-tight ${variant === "light" ? "text-charcoal dark:text-white" : "text-white"}`}
      >
        <span className={variant === "light" ? "text-brand" : "text-white/90"}>
          Hobby
        </span>
        Connect
      </span>
    </div>
  );

  if (link) {
    return (
      <Link href="/" className={className ? `flex items-center ${className}` : undefined}>
        {content}
      </Link>
    );
  }

  return content;
}
