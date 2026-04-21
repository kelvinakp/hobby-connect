import PostsFeed from "@/components/PostsFeed";
import CreatePostButton from "@/components/CreatePostButton";

export default function Home() {
  return (
    <div className="py-8">
      <div className="mx-auto mb-6 max-w-3xl rounded-2xl border border-charcoal-100/80 bg-white/80 px-5 py-4 shadow-sm backdrop-blur-xl dark:border-charcoal-700/80 dark:bg-charcoal-800/60">
        <h1 className="text-xl font-bold tracking-tight text-charcoal dark:text-white">
          Uni Announcement
        </h1>
        <p className="mt-1 text-sm text-charcoal-400 dark:text-charcoal-300">
          Official updates and community announcements in one place.
        </p>
      </div>
      <CreatePostButton />
      <PostsFeed />
    </div>
  );
}
