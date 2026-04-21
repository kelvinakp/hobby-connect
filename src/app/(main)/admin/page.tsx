import AdminDashboard from "@/components/AdminDashboard";

export default function AdminPage() {
  return (
    <div className="py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-charcoal dark:text-white">
            Admin Dashboard
          </h1>
          <p className="mt-1 text-sm text-charcoal-400 dark:text-charcoal-300">
            Manage users, review submitted posts, and remove inappropriate chat messages and events.
          </p>
        </div>
        <AdminDashboard />
      </div>
    </div>
  );
}
