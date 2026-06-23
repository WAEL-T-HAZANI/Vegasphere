"use client";

import { MoreHorizontal, Smile, Star } from "lucide-react";
import { cn } from "@/lib/classNames";
import { api } from "@/lib/api";
import {
  copyToClipboard,
  triggerBrowserDownload,
  QUICK_REACTIONS,
} from "@/lib/messageFormat";
import { formatApiError } from "@/lib/apiError";
import {
  DropdownPortal,
  DropdownRoot,
  DropdownSub,
  DropdownTrigger,
  VegaDropdownContent,
  VegaDropdownItem,
  VegaDropdownReactionItem,
  VegaDropdownSeparator,
  VegaDropdownSubContent,
  VegaDropdownSubTrigger,
} from "@/components/ui/VegaDropdownMenu";

export default function MessageBubbleActionsMenu({
  m,
  t,
  i18n,
  rtl = false,
  isMine,
  listVariant,
  canOpenMenu,
  isStarred,
  hasText,
  rawText,
  fileUrl,
  mediaUrl,
  isPoll,
  translating,
  setTranslating,
  setTranslateErr,
  setTranslation,
  setEmojiPickerOpen,
  onReply,
  onForward,
  onReact,
  onPin,
  onStar,
  onEdit,
  onDelete,
  onCancelSchedule,
  onViewThread,
}) {
  return (
    <div
      className={cn(
        "absolute end-2 top-2 z-10 transition-opacity",
        listVariant === "saved"
          ? "opacity-100"
          : "opacity-100 md:opacity-0 md:group-hover:opacity-100",
      )}
    >
      {listVariant === "saved" ? (
        <button
          type="button"
          className={cn(
            "inline-flex items-center justify-center rounded-full p-2 shadow-sm ring-1 transition",
            isMine
              ? "bg-white/10 text-white ring-white/15 hover:bg-white/15"
              : "bg-black/5 text-muted ring-black/10 hover:bg-black/10 dark:bg-white/10 dark:ring-white/10 dark:hover:bg-white/15",
          )}
          onClick={() => onStar?.(m)}
          title={isStarred ? t("removeSavedMessage") : t("saveMessage")}
          aria-label={isStarred ? t("removeSavedMessage") : t("saveMessage")}
        >
          <Star
            className={cn(
              "h-4 w-4",
              isStarred && (isMine ? "text-brand-200" : "text-brand-600 dark:text-brand-300"),
            )}
            aria-hidden
          />
        </button>
      ) : canOpenMenu ? (
        <DropdownRoot dir={rtl ? "rtl" : "ltr"}>
          <DropdownTrigger asChild>
            <button
              type="button"
              className={cn(
                "rounded-full p-1.5 outline-none backdrop-blur transition-colors focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:focus-visible:ring-offset-gray-950",
                isMine
                  ? "bg-white/10 hover:bg-white/15"
                  : "bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15",
              )}
              aria-label={t("messageActions")}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownTrigger>
          <DropdownPortal>
            <VegaDropdownContent
              side="top"
              align={rtl ? "start" : "end"}
              sideOffset={4}
              collisionPadding={12}
              avoidCollisions
              className="vs-msg-actions-menu z-[50]"
            >
              <VegaDropdownItem onSelect={() => onReply?.(m)}>
                {t("replyAction")}
              </VegaDropdownItem>
              {Number(m.threadReplyCount) > 0 && onViewThread ? (
                <VegaDropdownItem onSelect={() => onViewThread(m)}>
                  {t("viewThread")}
                </VegaDropdownItem>
              ) : null}
              <VegaDropdownItem onSelect={() => onForward?.(m)}>
                {t("forwardMessage")}
              </VegaDropdownItem>
              {hasText ? (
                <VegaDropdownItem
                  onSelect={() => {
                    void copyToClipboard(rawText);
                  }}
                >
                  {t("copyText")}
                </VegaDropdownItem>
              ) : null}
              {mediaUrl || fileUrl ? (
                <VegaDropdownItem
                  onSelect={() => {
                    void triggerBrowserDownload(
                      mediaUrl || fileUrl,
                      m.fileName || "",
                      { fileType: m.fileType || "" },
                    );
                  }}
                >
                  {t("downloadFile")}
                </VegaDropdownItem>
              ) : null}
              <DropdownSub>
                <VegaDropdownSubTrigger>{t("reactMessage")}</VegaDropdownSubTrigger>
                <DropdownPortal>
                  <VegaDropdownSubContent className="min-w-[12rem] p-2">
                    <div className="grid grid-cols-6 gap-1">
                      {QUICK_REACTIONS.map((r) => (
                        <VegaDropdownReactionItem
                          key={r}
                          className="!justify-center !px-0 !py-1.5 text-lg"
                          onSelect={() => onReact?.(m, r)}
                        >
                          {r}
                        </VegaDropdownReactionItem>
                      ))}
                    </div>
                    <VegaDropdownSeparator />
                    <VegaDropdownItem onSelect={() => setEmojiPickerOpen(true)}>
                      <Smile aria-hidden />
                      {t("moreEmojis")}
                    </VegaDropdownItem>
                  </VegaDropdownSubContent>
                </DropdownPortal>
              </DropdownSub>
              <VegaDropdownItem onSelect={() => onPin?.(m)}>
                {m.isPinned ? t("unpinMessage") : t("pinMessage")}
              </VegaDropdownItem>
              <VegaDropdownItem onSelect={() => onStar?.(m)}>
                {isStarred ? t("removeSavedMessage") : t("saveMessage")}
              </VegaDropdownItem>
              {m.text?.trim() && Number(m.e2eVersion) === 0 && !isPoll ? (
                <VegaDropdownItem
                  onSelect={async () => {
                    const text = String(rawText || "").trim();
                    if (!text) return;
                    setTranslateErr("");
                    setTranslation("");
                    setTranslating(true);
                    try {
                      const ui = (i18n.language || "en").split("-")[0].toLowerCase();
                      const targetLanguage = ui === "ar" ? "en" : "ar";
                      const { data } = await api.post("/ai/translate", {
                        text,
                        sourceLanguage: "auto",
                        targetLanguage,
                      });
                      setTranslation(String(data?.translatedText || ""));
                    } catch (err) {
                      setTranslateErr(formatApiError(err, t, "translationFailed"));
                    } finally {
                      setTranslating(false);
                    }
                  }}
                >
                  {translating ? "…" : t("translateMessage")}
                </VegaDropdownItem>
              ) : null}
              {isMine && m.scheduledStatus === "pending" && onCancelSchedule ? (
                <VegaDropdownItem onSelect={() => onCancelSchedule(m)}>
                  {t("cancelScheduledMessage")}
                </VegaDropdownItem>
              ) : null}
              {isMine && Number(m.e2eVersion) === 0 && !isPoll ? (
                <VegaDropdownItem onSelect={() => onEdit?.(m)}>
                  {t("editMessage")}
                </VegaDropdownItem>
              ) : null}
              {isMine ? (
                <VegaDropdownItem variant="danger" onSelect={() => onDelete?.(m)}>
                  {t("deleteMessage")}
                </VegaDropdownItem>
              ) : null}
            </VegaDropdownContent>
          </DropdownPortal>
        </DropdownRoot>
      ) : null}
    </div>
  );
}
