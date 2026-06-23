"use client";

import { useTranslation } from "react-i18next";
import NetworkingProfilePreview from "@/components/networking/NetworkingProfilePreview";
import SettingsToggleRow from "@/components/settings/SettingsToggleRow";

type NetworkingProfileFormProps = {
  userId?: string;
  previewName?: string;
  previewUsername?: string;
  previewPic?: string;
  headline: string;
  skills: string;
  interests: string;
  lookingFor: string;
  openToCollaborate: boolean;
  completeness: number;
  busy: boolean;
  onHeadlineChange: (_value: string) => void;
  onSkillsChange: (_value: string) => void;
  onInterestsChange: (_value: string) => void;
  onLookingForChange: (_value: string) => void;
  onOpenToCollaborateChange: (_value: boolean) => void;
  onSubmit: (_event: React.FormEvent) => void;
};

export default function NetworkingProfileForm({
  userId,
  previewName,
  previewUsername,
  previewPic,
  headline,
  skills,
  interests,
  lookingFor,
  openToCollaborate,
  completeness,
  busy,
  onHeadlineChange,
  onSkillsChange,
  onInterestsChange,
  onLookingForChange,
  onOpenToCollaborateChange,
  onSubmit,
}: NetworkingProfileFormProps) {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === "rtl";

  return (
    <section className="vs-settings-card space-y-4" dir={rtl ? "rtl" : "ltr"}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-ink">{t("networkingProfileTitle")}</h2>
          <p className="mt-1 text-sm text-muted">{t("networkingProfileHint")}</p>
        </div>
        <span className="vs-chip-current shrink-0 px-3 py-1 text-xs">
          {t("networkingProfileCompleteness", { percent: completeness })}
        </span>
      </div>

      <NetworkingProfilePreview
        userId={userId}
        name={previewName}
        username={previewUsername}
        profilePic={previewPic}
      />

      <form onSubmit={onSubmit} className="space-y-3">
        <input
          className="vs-input"
          value={headline}
          onChange={(e) => onHeadlineChange(e.target.value)}
          placeholder={t("networkingHeadlinePlaceholder")}
          dir="auto"
          maxLength={120}
        />
        <textarea
          className="vs-textarea"
          value={skills}
          onChange={(e) => onSkillsChange(e.target.value)}
          placeholder={t("networkingSkillsPlaceholder")}
          dir="auto"
          rows={3}
        />
        <textarea
          className="vs-textarea"
          value={interests}
          onChange={(e) => onInterestsChange(e.target.value)}
          placeholder={t("networkingInterestsPlaceholder")}
          dir="auto"
          rows={3}
        />
        <textarea
          className="vs-textarea"
          value={lookingFor}
          onChange={(e) => onLookingForChange(e.target.value)}
          placeholder={t("networkingLookingForPlaceholder")}
          dir="auto"
          rows={3}
        />
        <SettingsToggleRow
          label={t("networkingOpenToCollaborate")}
          checked={openToCollaborate}
          disabled={busy}
          onChange={onOpenToCollaborateChange}
        />
        <button type="submit" disabled={busy} className="vs-btn-primary">
          {busy ? t("networkingSaving") : t("saveChanges")}
        </button>
      </form>
    </section>
  );
}
