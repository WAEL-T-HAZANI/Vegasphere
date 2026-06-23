/**
 * Placeholder UI shown while the dashboard layout waits for auth/session.
 */
export default function DashboardPageSkeleton() {
  return (
    <div
      className="flex min-h-full min-w-0 flex-1 animate-pulse flex-col bg-canvas"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="sticky top-0 z-10 border-b border-brand-200/45 bg-surface/88 px-4 py-5 backdrop-blur-xl dark:border-white/10 dark:bg-black/80 md:px-8 md:py-6">
        <div className="mx-auto flex max-w-5xl items-start gap-3">
          <div className="h-11 w-11 shrink-0 rounded-2xl bg-brand-100/80 dark:bg-brand-900/30" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-7 w-48 max-w-full rounded-lg bg-brand-100/80 dark:bg-white/10" />
            <div className="h-4 w-72 max-w-full rounded bg-brand-100/60 dark:bg-white/10" />
          </div>
        </div>
      </div>
      <div className="mx-auto w-full max-w-5xl flex-1 space-y-4 px-4 py-6 md:px-8 md:py-8">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-16 w-full rounded-2xl border border-brand-200/40 bg-surface/80 dark:border-white/10 dark:bg-white/[0.03]"
          />
        ))}
      </div>
    </div>
  );
}
