import AppLogo from "@/components/AppLogo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[radial-gradient(circle_at_top_right,#f3e8ff_0%,#ffffff_40%)] dark:bg-[radial-gradient(circle_at_top_right,#2b0541_0%,#121212_45%)]">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-gradient-to-br from-brand-700 via-brand to-brand-400 p-12 text-white">
        <AppLogo variant="dark" size="md" link className="gap-3" />

        <div className="max-w-md">
          <h1 className="mb-4 text-4xl font-bold leading-tight">
            Connect with your
            <br />
            university community
          </h1>
          <p className="text-lg text-white/80">
            Join hobby groups, share skills, and grow together with fellow
            students at Rangsit University.
          </p>
        </div>

        <p className="text-sm text-white/50">
          &copy; {new Date().getFullYear()} HobbyConnect &middot; Rangsit
          University
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white/90 p-7 shadow-2xl shadow-charcoal-900/10 backdrop-blur-xl dark:border-charcoal-700/70 dark:bg-charcoal-900/70 dark:shadow-black/35">
          {children}
        </div>
      </div>
    </div>
  );
}
