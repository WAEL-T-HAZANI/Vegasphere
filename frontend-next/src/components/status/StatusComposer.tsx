"use client";

import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Image as ImageIcon, Send, X } from "lucide-react";
import { cn } from "@/lib/classNames";

const STATUS_MAX = 280;

type StatusComposerProps = {
  busy: boolean;
  onSubmit: (_payload: { text: string; imageFile: File | null }) => Promise<void>;
};

export default function StatusComposer({ busy, onSubmit }: StatusComposerProps) {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === "rtl";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [previewOk, setPreviewOk] = useState(true);

  const trimmedText = String(text || "").slice(0, STATUS_MAX);
  const canPost = Boolean(trimmedText.trim() || imageFile);

  const clearImage = () => {
    setImageFile(null);
    setPreviewOk(true);
    if (imagePreviewUrl) {
      try {
        URL.revokeObjectURL(imagePreviewUrl);
      } catch {
        /* ignore */
      }
    }
    setImagePreviewUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPost || busy) return;
    try {
      await onSubmit({ text: trimmedText.trim(), imageFile });
      setText("");
      clearImage();
    } catch {
      /* parent shows error */
    }
  };

  return (
    <section className={cn("vs-settings-card", "!p-4 sm:!p-5")} dir={rtl ? "rtl" : "ltr"}>
      <form onSubmit={handleSubmit} className="grid gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-semibold text-ink">{t("statusPost")}</div>
          <div className="text-xs font-semibold text-muted tabular-nums">
            {trimmedText.length}/{STATUS_MAX}
          </div>
        </div>

        <textarea
          className="vs-textarea min-h-[96px] text-start"
          placeholder={t("statusTextPlaceholder")}
          value={trimmedText}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          maxLength={STATUS_MAX}
          dir={rtl ? "rtl" : "ltr"}
        />

        <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2 rounded-2xl vs-brand-inset px-3 py-2.5 shadow-sm">
            <div className="flex min-w-0 items-center gap-2">
              <span className="vs-icon-tile inline-flex h-9 w-9 shrink-0 rounded-xl">
                <ImageIcon className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-muted">{t("statusImageLabel")}</div>
                <div className="truncate text-sm font-semibold text-ink">
                  {imageFile?.name || t("statusImageNone")}
                </div>
              </div>
            </div>
            <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
              {imageFile ? (
                <button type="button" onClick={clearImage} className="vs-btn-outline-sm min-h-10 px-3">
                  {t("remove")}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="vs-btn-primary-pill min-h-10 px-4 py-2"
              >
                {t("chooseImage")}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  setPreviewOk(true);
                  if (imagePreviewUrl) {
                    try {
                      URL.revokeObjectURL(imagePreviewUrl);
                    } catch {
                      /* ignore */
                    }
                  }
                  setImageFile(f);
                  setImagePreviewUrl(f ? URL.createObjectURL(f) : "");
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={busy || !canPost}
            className="vs-btn-primary-sm inline-flex min-h-11 w-full items-center justify-center gap-2 px-5 py-2.5 disabled:opacity-60 lg:w-auto lg:min-w-[9rem]"
          >
            <Send className="h-4 w-4" aria-hidden />
            {busy ? t("statusPosting") : t("statusPost")}
          </button>
        </div>

        {imagePreviewUrl && previewOk ? (
          <div className="relative overflow-hidden rounded-2xl border vs-brand-divider bg-canvas/70 dark:border-brand-800/30">
            <button
              type="button"
              onClick={clearImage}
              className="absolute end-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/70"
              aria-label={t("remove")}
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePreviewUrl}
              alt=""
              className="max-h-72 w-full object-contain sm:max-h-80"
              onError={() => setPreviewOk(false)}
            />
          </div>
        ) : null}
      </form>
    </section>
  );
}
