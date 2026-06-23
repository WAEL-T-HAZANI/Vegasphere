"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Copy,
  Lightbulb,
  MessageCircle,
  MoreHorizontal,
  WandSparkles,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/classNames";
import {
  formatNetworkingReason,
  networkingUserId,
  networkingUserLabel,
  type NetworkingReason,
} from "@/lib/networkingHub";
import PresenceDot from "@/components/presence/PresenceDot";
import { presenceStateForUser } from "@/hooks/usePresenceBatch";
import {
  DropdownPortal,
  DropdownRoot,
  DropdownTrigger,
  VegaDropdownContent,
  VegaDropdownIconTrigger,
  VegaDropdownItem,
} from "@/components/ui/VegaDropdownMenu";
import PrivacySelectField from "@/components/privacy/PrivacySelectField";

export type NetworkingMatch = {
  user?: {
    _id?: string;
    name?: string;
    username?: string;
    profilePic?: string;
    networkingHeadline?: string;
    networkingLookingFor?: string;
    networkingSkills?: string[];
    networkingInterests?: string[];
  };
  matchScore?: number;
  sharedSkills?: string[];
  sharedInterests?: string[];
  reasons?: NetworkingReason[];
};

type IntroTone = "friendly" | "formal" | "short";

type NetworkingMatchCardProps = {
  item: NetworkingMatch;
  viewerLookingFor: string;
  actionsBusy: boolean;
  hasDirectChat: boolean;
  presenceById?: Record<string, { online?: boolean; lastSeen?: string }>;
  onStartChat: (_userId: string) => void;
  onCopyIntro: (_text: string) => void;
  onGenerateIntro: (_userId: string, _tone: IntroTone) => Promise<string>;
  onBlock: (_userId: string) => void;
  onIgnore: (_userId: string) => void;
  onReport: (_userId: string) => void;
};

export default function NetworkingMatchCard({
  item,
  viewerLookingFor,
  actionsBusy,
  hasDirectChat,
  presenceById,
  onStartChat,
  onCopyIntro,
  onGenerateIntro,
  onBlock,
  onIgnore,
  onReport,
}: NetworkingMatchCardProps) {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === "rtl";
  const [showIntro, setShowIntro] = useState(false);
  const [introText, setIntroText] = useState("");
  const [introTone, setIntroTone] = useState<IntroTone>("friendly");
  const [introBusy, setIntroBusy] = useState(false);

  const target = item.user || {};
  const userId = networkingUserId(target);
  const label = networkingUserLabel(target) || t("networkingMemberFallback");
  const bioLine =
    target.networkingHeadline ||
    target.networkingLookingFor ||
    [...(target.networkingSkills || []), ...(target.networkingInterests || [])]
      .slice(0, 4)
      .join(i18n.language?.startsWith("ar") ? "، " : ", ") ||
    t("networkingMemberFallback");
  const tags = [...(item.sharedSkills || []), ...(item.sharedInterests || [])].slice(0, 5);
  const initials = label.slice(0, 2).toUpperCase();

  const toneOptions = [
    { value: "friendly", label: t("networkingIntroToneFriendly") },
    { value: "formal", label: t("networkingIntroToneFormal") },
    { value: "short", label: t("networkingIntroToneShort") },
  ];

  const handleIntro = async (tone: IntroTone = introTone) => {
    if (!userId) return;
    if (showIntro && tone === introTone) {
      setShowIntro(false);
      return;
    }
    setIntroBusy(true);
    try {
      const text = await onGenerateIntro(userId, tone);
      setIntroText(text);
      setShowIntro(true);
    } finally {
      setIntroBusy(false);
    }
  };

  return (
    <article className="vs-feed-card p-4" dir={rtl ? "rtl" : "ltr"}>
      <div className="flex items-start gap-3">
        <Link
          href={userId ? `/user/${encodeURIComponent(userId)}` : "#"}
          className="relative block h-12 w-12 shrink-0"
          aria-label={t("viewProfile")}
        >
          <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-2xl vs-icon-tile text-sm font-extrabold">
            {target.profilePic ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={target.profilePic} alt="" className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <span className="pointer-events-none absolute bottom-0 end-0 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-surface ring-1 ring-brand-200/60 dark:bg-black dark:ring-white/10">
            <PresenceDot state={presenceStateForUser(presenceById, userId)} />
          </span>
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <Link
              href={userId ? `/user/${encodeURIComponent(userId)}` : "#"}
              className="truncate text-sm font-semibold text-ink hover:underline"
            >
              {label}
            </Link>
            <span className="vs-btn-primary-pill shrink-0 px-2.5 py-1 text-xs">
              {t("networkingMatchScore", { score: item.matchScore ?? 0 })}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-muted" dir="auto">
            {bioLine}
          </p>
        </div>
      </div>

      {tags.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span key={tag} className="vs-chip-current px-2 py-0.5 text-[11px]">
              #{tag}
            </span>
          ))}
        </div>
      ) : null}

      <ul className="mt-3 space-y-1 text-xs text-muted">
        {(item.reasons || []).slice(0, 3).map((reason, idx) => (
          <li key={`${userId}-reason-${idx}`} className="flex gap-2">
            <Lightbulb className="vs-brand-icon-accent mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span dir="auto">{formatNetworkingReason(reason, t)}</span>
          </li>
        ))}
      </ul>

      {showIntro ? (
        <div className="vs-muted-panel mt-3 text-sm" dir="auto">
          <p>{introText}</p>
          <button
            type="button"
            onClick={() => onCopyIntro(introText)}
            className="vs-brand-text-link mt-2 inline-flex items-center gap-1 text-xs"
          >
            <Copy className="h-3.5 w-3.5" />
            {t("copy")}
          </button>
        </div>
      ) : null}

      <div className="mt-3 space-y-2">
        <p className="text-xs font-semibold text-muted">{t("networkingIntroToneLabel")}</p>
        <PrivacySelectField
          value={introTone}
          options={toneOptions}
          onChange={(value) => {
            const tone = value as IntroTone;
            setIntroTone(tone);
            if (showIntro) void handleIntro(tone);
          }}
          rtl={rtl}
          ariaLabel={t("networkingIntroToneLabel")}
          fullWidth
        />
      </div>

      {hasDirectChat ? (
        <p className="mt-2 text-xs font-semibold text-muted">{t("networkingAlreadyConnected")}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={actionsBusy || !userId}
          onClick={() => onStartChat(userId)}
          className="vs-btn-primary-inline gap-2"
        >
          <MessageCircle className="h-4 w-4" />
          {t("startChat")}
        </button>
        <button
          type="button"
          disabled={!userId || introBusy}
          onClick={() => void handleIntro()}
          className="vs-btn-outline inline-flex items-center gap-2 px-4 py-2 text-sm"
        >
          <WandSparkles className="h-4 w-4" />
          {introBusy
            ? t("networkingIntroGenerating")
            : showIntro
              ? t("networkingHideIntro")
              : t("networkingGenerateIntro")}
        </button>

        <DropdownRoot dir={rtl ? "rtl" : "ltr"}>
          <DropdownTrigger asChild>
            <VegaDropdownIconTrigger
              disabled={actionsBusy || !userId}
              aria-label={t("searchMoreActions")}
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden />
            </VegaDropdownIconTrigger>
          </DropdownTrigger>
          <DropdownPortal>
            <VegaDropdownContent align="end" className="z-[300]">
              <VegaDropdownItem onSelect={() => onIgnore(userId)}>
                {t("contactIgnoreNotifications")}
              </VegaDropdownItem>
              <VegaDropdownItem onSelect={() => onReport(userId)}>
                {t("privacyReportTitle")}
              </VegaDropdownItem>
              <VegaDropdownItem variant="danger" onSelect={() => onBlock(userId)}>
                {t("blockUser")}
              </VegaDropdownItem>
            </VegaDropdownContent>
          </DropdownPortal>
        </DropdownRoot>
      </div>
    </article>
  );
}
