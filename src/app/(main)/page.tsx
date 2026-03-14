import AppLogo from "@/components/AppLogo";
import HobbyFeed from "@/components/HobbyFeed";

export default function Home() {
  return (
    <div className="py-8">
      <div className="relative mx-auto mb-10 max-w-2xl overflow-hidden rounded-2xl bg-gradient-to-b from-brand-50/60 to-white px-6 py-8 text-center dark:from-brand-900/20 dark:to-charcoal-900">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,var(--color-brand-200),transparent)] opacity-40 dark:opacity-20" aria-hidden />
        <div className="relative">
          <div className="mb-5 flex justify-center">
            <AppLogo variant="light" size="md" />
          </div>
          <h1 className="mb-2 text-2xl font-bold tracking-tight text-charcoal dark:text-white">
            Welcome to <span className="text-brand">Hobby</span>Connect
          </h1>
          <p className="text-sm text-charcoal-400 dark:text-charcoal-300">
            Discover communities, share skills, and grow together with fellow
            students at Rangsit University.
          </p>
        </div>
      </div>

      <HobbyFeed />
    </div>
  );
}
