import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ThemeProvider from "@/components/ThemeProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HobbyConnect",
  description:
    "University Hobby & Skill Community Management System — connect, organize, and grow together.",
  icons: {
    icon: [
      { url: "/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/favicon/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

function SupabaseConfigGuard({ children }: { children: React.ReactNode }) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const missing =
    !url ||
    !key ||
    url.startsWith("your_") ||
    key.startsWith("your_");

  if (missing) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 text-charcoal dark:bg-charcoal dark:text-charcoal-100">
        <h1 className="mb-2 text-lg font-semibold">Configuration required</h1>
        <p className="max-w-md text-center text-sm text-charcoal-500 dark:text-charcoal-400">
          Supabase environment variables are missing or placeholder. In your
          Vercel project, set{" "}
          <code className="rounded bg-charcoal-100 px-1 dark:bg-charcoal-800">
            NEXT_PUBLIC_SUPABASE_URL
          </code>{" "}
          and{" "}
          <code className="rounded bg-charcoal-100 px-1 dark:bg-charcoal-800">
            NEXT_PUBLIC_SUPABASE_ANON_KEY
          </code>{" "}
          under Settings → Environment Variables, then redeploy.
        </p>
        <p className="mt-4 text-xs text-charcoal-400 dark:text-charcoal-500">
          <a
            href="https://supabase.com/dashboard/project/_/settings/api"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Get values from Supabase Dashboard →
          </a>
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white text-charcoal dark:bg-charcoal dark:text-charcoal-100`}
      >
        <SupabaseConfigGuard>
          <ThemeProvider>{children}</ThemeProvider>
        </SupabaseConfigGuard>
      </body>
    </html>
  );
}
