export const dynamic = "force-dynamic";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-brand-50 px-4 dark:from-charcoal-900 dark:via-charcoal dark:to-charcoal-900">
      {children}
    </div>
  );
}
