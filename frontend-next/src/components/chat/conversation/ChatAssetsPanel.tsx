"use client";

import { Images, FileText, Link2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/classNames";
import { triggerBrowserDownload } from "@/lib/messageFormat";

export default function ChatAssetsPanel({
  assetsTab,
  onChangeTab,
  onClose,
  mediaTiles,
  fileItems,
  linkItems,
  onOpenMedia,
  onJump,
  t,
}) {
  return (
    <section className="border-b border-brand-200/45 bg-surface/82 px-3 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-black/75 md:px-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: "media", label: t("chatAssetsMedia"), Icon: Images },
            { id: "files", label: t("chatAssetsFiles"), Icon: FileText },
            { id: "links", label: t("chatAssetsLinks"), Icon: Link2 },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onChangeTab(id)}
              className={cn(
                "vs-segment-btn inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                assetsTab === id
                  ? "bg-brand-600 text-white shadow-sm shadow-brand-600/25"
                  : "border border-brand-200/45 bg-surface/70 text-muted hover:bg-brand-50/70 hover:text-brand-700 dark:border-white/10 dark:bg-white/[0.025] dark:hover:bg-brand-900/25 dark:hover:text-brand-200",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="vs-btn-outline-sm rounded-full"
        >
          {t("chatAssetsClose")}
        </button>
      </div>

      <div className="vs-scroll-panel mt-3 max-h-56">
        {assetsTab === "media" ? (
          mediaTiles.length ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {mediaTiles.map((item) => (
                <div
                  key={`media-${item.messageId}`}
                  className={cn("vs-stat-tile flex flex-col shadow-sm", "!p-2")}
                >
                  <button
                    type="button"
                    onClick={() => onOpenMedia(item.messageId)}
                    className="block w-full overflow-hidden rounded-xl"
                  >
                    {item.type === "video" ? (
                      <video
                        src={item.url}
                        className="h-24 w-full rounded-xl object-cover"
                        muted
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.url}
                        alt=""
                        className="h-24 w-full rounded-xl object-cover"
                      />
                    )}
                  </button>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onJump(item.messageId)}
                      className={cn(
                        "vs-btn-outline-sm flex-1 rounded-xl !py-1 !text-[11px]",
                      )}
                    >
                      {t("chatAssetsJump")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="px-2 py-6 text-center text-sm text-muted">
              {t("chatAssetsEmpty")}
            </p>
          )
        ) : null}

        {assetsTab === "files" ? (
          fileItems.length ? (
            <div className="space-y-2">
              {fileItems.map((item) => (
                <div key={`file-${item.messageId}`} className="vs-list-row">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-ink">
                      {item.fileName}
                    </div>
                    <div className="text-[11px] text-muted">
                      {item.fileType || t("fileAttachment")}
                    </div>
                  </div>
                  {item.url ? (
                    <button
                      type="button"
                      onClick={() => {
                        void triggerBrowserDownload(item.url, item.fileName || "");
                      }}
                      className={cn(
                        "vs-btn-outline-sm rounded-xl !py-1 !text-[11px]",
                      )}
                    >
                      {t("chatAssetsOpen")}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onJump(item.messageId)}
                    className="vs-btn-outline-sm rounded-xl !py-1 !text-[11px]"
                  >
                    {t("chatAssetsJump")}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="px-2 py-6 text-center text-sm text-muted">
              {t("chatAssetsEmpty")}
            </p>
          )
        ) : null}

        {assetsTab === "links" ? (
          linkItems.length ? (
            <div className="space-y-2">
              {linkItems.map((item) => (
                <div key={`link-${item.messageId}`} className="vs-list-row">
                  <div className="min-w-0 flex-1">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"
                    >
                      {item.url}
                    </a>
                    <div className="truncate text-[11px] text-muted">
                      {item.preview}
                    </div>
                  </div>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                      "vs-btn-outline-sm inline-flex items-center gap-1 rounded-xl !py-1 !text-[11px]",
                    )}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {t("chatAssetsOpen")}
                  </a>
                  <button
                    type="button"
                    onClick={() => onJump(item.messageId)}
                    className="vs-btn-outline-sm rounded-xl !py-1 !text-[11px]"
                  >
                    {t("chatAssetsJump")}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="px-2 py-6 text-center text-sm text-muted">
              {t("chatAssetsEmpty")}
            </p>
          )
        ) : null}
      </div>
    </section>
  );
}
