import HobbyFeed from "@/components/HobbyFeed";

export default function Home() {
  return (
    <div className="py-8">
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-white shadow-lg shadow-brand/25">
          <span className="text-xl font-bold">H</span>
        </div>
        <h1 className="mb-2 text-2xl font-bold tracking-tight text-charcoal dark:text-white">
          Welcome to HobbyConnect
        </h1>
        <p className="text-sm text-charcoal-400 dark:text-charcoal-300">
          Discover communities, share skills, and grow together with fellow
          students at Rangsit University.
        </p>
      </div>

      <HobbyFeed />
    </div>
  );
}
