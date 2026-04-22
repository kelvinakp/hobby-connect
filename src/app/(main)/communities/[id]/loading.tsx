export default function CommunityLoading() {
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="shrink-0 border-b border-charcoal-100 pb-5 dark:border-charcoal-700">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 shrink-0 animate-pulse rounded-2xl bg-charcoal-100 dark:bg-charcoal-700" />
          <div className="min-w-0 flex-1">
            <div className="h-8 w-64 animate-pulse rounded bg-charcoal-100 dark:bg-charcoal-700" />
            <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-charcoal-100 dark:bg-charcoal-700" />
            <div className="mt-3 flex gap-2">
              <div className="h-6 w-24 animate-pulse rounded-full bg-charcoal-100 dark:bg-charcoal-700" />
              <div className="h-6 w-28 animate-pulse rounded-full bg-charcoal-100 dark:bg-charcoal-700" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 gap-1 rounded-xl bg-charcoal-50 p-1.5 dark:bg-charcoal-800">
          <div className="h-10 flex-1 animate-pulse rounded-lg bg-charcoal-100 dark:bg-charcoal-700" />
          <div className="h-10 flex-1 animate-pulse rounded-lg bg-charcoal-100 dark:bg-charcoal-700" />
          <div className="h-10 flex-1 animate-pulse rounded-lg bg-charcoal-100 dark:bg-charcoal-700" />
        </div>
        <div className="mt-4 flex flex-1 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        </div>
      </div>
    </div>
  );
}
