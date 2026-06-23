"use client";

import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import MemberPicker from "@/components/chat/MemberPicker";
import type { ConversationMember } from "@/types/api";

type GroupCreateFormProps = {
  name: string;
  description: string;
  selectedMembers: ConversationMember[];
  memberSuggestions: ConversationMember[];
  currentUserId?: string;
  busy: boolean;
  onNameChange: (_value: string) => void;
  onDescriptionChange: (_value: string) => void;
  onMembersChange: (_members: ConversationMember[]) => void;
  onSubmit: (_event: React.FormEvent) => void;
};

export default function GroupCreateForm({
  name,
  description,
  selectedMembers,
  memberSuggestions,
  currentUserId,
  busy,
  onNameChange,
  onDescriptionChange,
  onMembersChange,
  onSubmit,
}: GroupCreateFormProps) {
  const { t, i18n } = useTranslation();
  const dir = i18n.dir();

  const selectedCount = selectedMembers.length;

  return (
    <section id="create-group" dir={dir} className="vs-settings-card space-y-4">
      <div className="text-start">
        <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
          <Sparkles className="vs-brand-icon-accent h-5 w-5 shrink-0" aria-hidden />
          {t("createNewGroup")}
        </h2>
        <p className="mt-1 text-sm text-muted">{t("groupsCreateIntro")}</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <input
          id="group-name"
          className="vs-input w-full"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={t("nameLabel")}
          aria-label={t("nameLabel")}
          dir="auto"
          required
          maxLength={80}
        />
        <div className="text-start">
          <label className="vs-label" htmlFor="group-desc">
            {t("groupDescription")}
          </label>
          <input
            id="group-desc"
            className="vs-input mt-1 w-full"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder={t("groupCreateDescriptionPlaceholder")}
            dir="auto"
            maxLength={180}
          />
        </div>
        <MemberPicker
          title={t("memberPickerTitle")}
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
          {busy ? t("groupsSaving") : t("createGroupSubmit")}
        </button>
      </form>
    </section>
  );
}
