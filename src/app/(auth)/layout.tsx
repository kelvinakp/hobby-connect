import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-gradient-to-br from-brand-600 via-brand to-brand-400 p-12 text-white">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            <span className="text-lg font-bold">H</span>
          </div>
          <span className="text-xl font-semibold tracking-tight">
            HobbyConnect
          </span>
        </Link>

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
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
