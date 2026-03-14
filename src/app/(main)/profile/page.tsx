import ProfileEditor from "@/components/ProfileEditor";

export default function ProfilePage() {
  return (
    <div className="py-8">
      <div className="mx-auto mb-8 max-w-xl">
        <h1 className="text-2xl font-bold tracking-tight text-charcoal dark:text-white">
          My Profile
        </h1>
        <p className="mt-1 text-sm text-charcoal-400 dark:text-charcoal-300">
          Manage your personal information visible to other students.
        </p>
      </div>

      <ProfileEditor />
    </div>
  );
}
