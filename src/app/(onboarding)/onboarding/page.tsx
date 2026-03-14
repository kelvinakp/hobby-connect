import OnboardingForm from "@/components/OnboardingForm";

export default function OnboardingPage() {
  return (
    <div className="w-full max-w-2xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-charcoal dark:text-white">
          Welcome to <span className="text-brand">HobbyConnect</span>
        </h1>
        <p className="mt-2 text-sm text-charcoal-400 dark:text-charcoal-300">
          Tell us about your interests and skill levels so we can personalize your experience.
        </p>
      </div>
      <OnboardingForm />
    </div>
  );
}
