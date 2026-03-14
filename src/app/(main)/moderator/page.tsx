import ModeratorDashboard from "@/components/ModeratorDashboard";

export default function ModeratorPage() {
  return (
    <div className="py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-charcoal dark:text-white">
            Moderator Dashboard
          </h1>
          <p className="mt-1 text-sm text-charcoal-400 dark:text-charcoal-300">
            Manage users, ban/unban accounts, and remove inappropriate chat messages and events.
          </p>
        </div>
        <ModeratorDashboard />
      </div>
    </div>
  );
}
