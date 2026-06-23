export default function ChatPageSkeleton() {
  return (
    <div
      className="flex h-full min-h-0 flex-1 animate-pulse flex-col bg-canvas"
      aria-busy="true"
      aria-label="Loading chat"
    >
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-brand-200/45 bg-surface/80 px-4 backdrop-blur dark:border-white/10 dark:bg-black/70">
        <div className="h-9 w-9 rounded-full bg-brand-100/80 dark:bg-brand-900/30" />
        <div className="h-5 max-w-xs flex-1 rounded bg-brand-100/70 dark:bg-white/10" />
      </div>
      <div className="flex flex-1 flex-col gap-3 overflow-hidden p-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div
            key={i}
            className={`h-12 rounded-2xl bg-brand-100/60 dark:bg-white/[0.04] ${
              i % 2 ? "ml-8" : "mr-16"
            }`}
          />
        ))}
      </div>
      <div className="h-14 shrink-0 border-t border-brand-200/45 dark:border-white/10" />
    </div>
  );
}
