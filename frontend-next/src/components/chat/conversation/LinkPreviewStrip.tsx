"use client";

export default function LinkPreviewStrip({ linkPreview }) {
  if (!linkPreview?.title) return null;

  return (
    <div className="border-t border-gray-200 px-3 py-2 dark:border-gray-700">
      <a
        href={linkPreview.url}
        target="_blank"
        rel="noopener noreferrer"
        className="vs-link-preview"
      >
        {linkPreview.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={linkPreview.image}
            alt=""
            className="h-14 w-14 shrink-0 rounded object-cover"
          />
        ) : null}
        <div className="min-w-0">
          <div className="line-clamp-2 font-medium">{linkPreview.title}</div>
          {linkPreview.siteName ? (
            <div className="text-[10px] text-muted">{linkPreview.siteName}</div>
          ) : null}
        </div>
      </a>
    </div>
  );
}
