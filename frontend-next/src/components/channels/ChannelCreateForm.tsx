"use client";

import { Hash, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import MemberPicker from "@/components/chat/MemberPicker";
import { cn } from "@/lib/classNames";
import { normalizeChannelSlugInput } from "@/lib/channelsHub";
import type { ChannelVisibility } from "@/lib/channelsHub";
import type { ConversationMember } from "@/types/api";

type ChannelCreateFormProps = {
  name: string;
  description: string;
  slug: string;
  visibility: ChannelVisibility;
  selectedMembers: ConversationMember[];
  memberSuggestions: ConversationMember[];
  currentUserId?: string;
  busy: boolean;
  onNameChange: (_value: string) => void;
  onDescriptionChange: (_value: string) => void;
  onSlugChange: (_value: string) => void;
  onVisibilityChange: (_value: ChannelVisibility) => void;
  onMembersChange: (_members: ConversationMember[]) => void;
  onSubmit: (_event: React.FormEvent) => void;
};

export default function ChannelCreateForm({
  name,
  description,
  slug,
  visibility,
  selectedMembers,
  memberSuggestions,
  currentUserId,
  busy,
  onNameChange,
  onDescriptionChange,
  onSlugChange,
  onVisibilityChange,
  onMembersChange,
  onSubmit,
}: ChannelCreateFormProps) {
  const { t, i18n } = useTranslation();
  const dir = i18n.dir();

  const selectedCount = selectedMembers.length;

  return (
    <section id="create-channel" dir={dir} className="vs-settings-card space-y-4">
      <div className="text-start">
        <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
          <Sparkles className="vs-brand-icon-accent h-5 w-5 shrink-0" aria-hidden />
          {t("createNewChannelSection")}
        </h2>
        <p className="mt-1 text-sm text-muted">{t("channelsCreateIntro")}</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <fieldset className="min-w-0 text-start">
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            {t("channelsVisibilityLabel")}
          </legend>
          <div className="flex flex-wrap gap-2">
            {(["public", "private"] as const).map((value) => (
              <label
                key={value}
                className={cn(
                  "cursor-pointer rounded-full border px-3 py-2 text-xs font-semibold transition",
                  visibility === value
                    ? "border-brand-300 bg-brand-50 text-brand-800 dark:border-brand-700 dark:bg-brand-900/30 dark:text-brand-200"
                    : "border-brand-200/50 bg-surface text-muted hover:bg-brand-50/60 dark:border-brand-800/40",
                )}
              >
                <input
                  type="radio"
                  name="visibility"
                  value={value}
                  checked={visibility === value}
                  onChange={() => onVisibilityChange(value)}
                  className="sr-only"
                />
                {value === "public"
                  ? t("channelsVisibilityPublic")
                  : t("channelsVisibilityPrivate")}
              </label>
            ))}
          </div>
        </fieldset>

        <input
          id="channel-name"
          className="vs-input w-full"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={t("channelName")}
          aria-label={t("channelName")}
          dir="auto"
          required
          maxLength={80}
        />

        <div className="text-start">
          <label className="vs-label" htmlFor="channel-desc">
            {t("channelDescription")}
          </label>
          <input
            id="channel-desc"
            className="vs-input mt-1 w-full"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder={t("groupCreateDescriptionPlaceholder")}
            dir="auto"
            maxLength={180}
          />
        </div>

        <div className="text-start">
          <label className="vs-label" htmlFor="channel-slug">
            {t("channelSlugOptional")}
          </label>
          <div className="relative mt-1">
            <Hash
              className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <input
              id="channel-slug"
              className="vs-input w-full py-2 ps-9 pe-3"
              placeholder={t("channelSlugOptional")}
              value={slug}
              onChange={(e) => onSlugChange(normalizeChannelSlugInput(e.target.value))}
              dir="ltr"
              maxLength={48}
              aria-label={t("channelSlugOptional")}
            />
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-muted">{t("channelSlugArabicHint")}</p>
        </div>

        <MemberPicker
          title={t("memberPickerTitle")}
          helperText={
            visibility === "private"
              ? t("channelCreatePrivateHint")
              : t("channelCreatePublicHint")
          }
          placeholder={t("memberPickerContactsPlaceholder")}
          selectedUsers={selectedMembers}
          onChange={onMembersChange}
          initialSuggestions={memberSuggestions}
          excludeIds={currentUserId ? [currentUserId] : []}
          disabled={busy}
          emptyText={t("memberPickerContactsEmpty")}
          loadingText={t("memberPickerSearching")}
          addLabel={t("groupAddMember")}
          contactsOnly
        />
        <p className="text-start text-xs leading-relaxed text-muted">
          {selectedCount > 0
            ? t("groupCreateSelectedHint", { count: selectedCount })
            : t("groupCreateSoloHint")}
        </p>

        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="vs-btn-primary inline-flex w-full items-center justify-center gap-2 py-2.5 text-sm disabled:opacity-60"
        >
          <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
          {busy ? t("channelsSaving") : t("createChannelSubmit")}
        </button>
      </form>
    </section>
  );
}
