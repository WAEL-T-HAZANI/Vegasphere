import { cn } from "@/lib/classNames";
import {
  findOriginalSearchMatchRange,
  isSearchQueryLongEnough,
} from "@/lib/searchQuery";

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

export function renderHighlightedText(content, query, isMine = false) {
  const source = String(content || "");
  const q = String(query || "").trim();
  if (!source || !q || !isSearchQueryLongEnough(q)) return source;

  const parts: Array<{ text: string; match: boolean }> = [];
  let cursor = 0;
  while (cursor < source.length) {
    const tail = source.slice(cursor);
    const range = findOriginalSearchMatchRange(tail, q);
    if (!range) {
      parts.push({ text: source.slice(cursor), match: false });
      break;
    }
    const [relStart, relEnd] = range;
    const absStart = cursor + relStart;
    const absEnd = cursor + relEnd;
    if (relStart > 0) {
      parts.push({ text: source.slice(cursor, absStart), match: false });
    }
    parts.push({ text: source.slice(absStart, absEnd), match: true });
    cursor = absEnd;
  }

  return (
    <>
      {parts.map((part, idx) =>
        part.match ? (
          <mark
            key={`m-${idx}`}
            className={cn(
              "vs-msg-search-mark",
              isMine && "vs-msg-search-mark--mine",
            )}
          >
            {part.text}
          </mark>
        ) : (
          <span key={`t-${idx}`}>{part.text}</span>
        ),
      )}
    </>
  );
}
