import { cn } from "@/lib/classNames";
import { escapeRegExp } from "@/lib/messageFormat";

export function formatTextWithAtHighlights(text, isMine) {
  if (!text) return null;
  const parts = String(text).split(/(@[^\s@]+)/g);
  return parts.map((p, i) =>
    p.startsWith("@") ? (
      <span
        key={i}
        className={cn(
          "font-semibold",
          isMine
            ? "rounded-sm bg-white/20 px-0.5 text-brand-100 ring-1 ring-white/25"
            : "text-brand-800 underline decoration-brand-500/80 decoration-2 underline-offset-2 dark:text-[rgb(var(--vega-ink))]/90 dark:decoration-brand-400/70",
        )}
      >
        {p}
      </span>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

export function renderHighlightedText(content, query) {
  const source = String(content || "");
  const q = String(query || "").trim();
  if (!source || !q) return source;
  const parts = source.split(new RegExp(`(${escapeRegExp(q)})`, "ig"));
  return parts.map((part, idx) =>
    part.toLowerCase() === q.toLowerCase() ? (
      <mark
        key={`${part}-${idx}`}
        className="rounded bg-brand-200/90 px-0.5 text-brand-950 dark:bg-brand-800/70 dark:text-[rgb(var(--vega-ink))]"
      >
        {part}
      </mark>
    ) : (
      <span key={`${part}-${idx}`}>{part}</span>
    )
  );
}
