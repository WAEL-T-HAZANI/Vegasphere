"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Compass, Languages, Sparkles } from "lucide-react";
import { useAiTour } from "@/components/ai/AiTourProvider";
import AiTonePicker from "@/components/ai/AiTonePicker";
import DashboardPageLayout from "@/components/layout/DashboardPageLayout";
import PrivacySelectField from "@/components/privacy/PrivacySelectField";
import ShellSegmentTabs from "@/components/layout/ShellSegmentTabs";
import { cn } from "@/lib/classNames";
import {
  AI_PREVIEW_SAMPLES,
  DEFAULT_PREVIEW_CONTEXT_ID,
  getPreviewTexts,
} from "@/lib/aiPreviewContext";
import { getTranslateLanguages, type LangOption } from "@/lib/translateLanguages";

const SmartReplyBar = dynamic(() => import("@/components/ai/SmartReplyBar"), {
  loading: () => (
    <div className="h-24 animate-pulse rounded-xl bg-surface/70 dark:bg-brand-900/20" />
  ),
});

const AiTranslatePanel = dynamic(() => import("@/components/ai/AiTranslatePanel"), {
  loading: () => (
    <div className="h-48 animate-pulse rounded-xl bg-surface/70 dark:bg-brand-900/20" />
  ),
});

type TabId = "replies" | "translate" | "tour";

export default function AiServicesPage() {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === "rtl";
  const isArabic = i18n.language?.startsWith("ar");

  const [tab, setTab] = useState<TabId>("replies");
  const [picked, setPicked] = useState("");
  const [contextId, setContextId] = useState(DEFAULT_PREVIEW_CONTEXT_ID);
  const [langs, setLangs] = useState<LangOption[]>([]);
  const { startTour, aiTab } = useAiTour();

  const previewContext = useMemo(
    () => getPreviewTexts(contextId, Boolean(isArabic)),
    [contextId, isArabic],
  );

  const contextOptions = useMemo(
    () =>
      AI_PREVIEW_SAMPLES.map((sample) => ({
        value: sample.id,
        label: t(sample.labelKey),
      })),
    [t],
  );

  useEffect(() => {
    let alive = true;
    getTranslateLanguages().then((list) => {
      if (!alive) return;
      setLangs(list || []);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (aiTab === "replies" || aiTab === "translate" || aiTab === "tour") {
      setTab(aiTab);
    }
  }, [aiTab]);

  const langOptions = useMemo(() => (Array.isArray(langs) && langs.length ? langs : []), [langs]);

  const segmentTabs = [
    { id: "replies", label: t("aiTabSmartReplies"), icon: Sparkles },
    { id: "translate", label: t("aiTabTranslate"), icon: Languages },
    { id: "tour", label: t("aiTabTour"), icon: Compass },
  ];

  return (
    <>
      <DashboardPageLayout
        variant="simple"
        title={t("navAi")}
        description={t("aiServicesSubtitle")}
        maxWidth="5xl"
        headerExtra={
          <div data-tour="ai-page-header">
            <ShellSegmentTabs
              tabs={segmentTabs}
              active={tab}
              onChange={(id) => setTab(id as TabId)}
              tourPrefix="ai"
            />
          </div>
        }
      >
        <div className="grid gap-4 sm:gap-5">
          <div className={cn(tab !== "replies" && "hidden")} aria-hidden={tab !== "replies"}>
            <section
              data-tour="ai-replies-panel"
              className="vs-settings-card overflow-hidden !p-0"
            >
              <div className="vs-brand-panel-head px-4 py-4 md:px-5">
                <div className="text-sm font-semibold text-ink">{t("aiFeatureRepliesTitle")}</div>
                <div className="mt-1 text-xs font-semibold leading-relaxed text-muted">
                  {t("aiFeatureRepliesHint")}
                </div>
              </div>

              <div className="border-b vs-brand-divider px-4 py-4 dark:border-brand-800/30 md:px-5">
                <div className="mb-2 text-xs font-semibold text-muted">{t("aiToneLabel")}</div>
                <AiTonePicker />
                <p className="mt-2 text-[11px] leading-relaxed text-muted/90">
                  {t("aiToneServicesHint")}
                </p>
              </div>

              <div
                className="border-b vs-brand-divider px-4 py-4 dark:border-brand-800/30 md:px-5"
                data-tour="ai-context-picker"
              >
                <div className="mb-2 text-xs font-semibold text-muted">{t("aiContextLabel")}</div>
                <PrivacySelectField
                  value={contextId}
                  options={contextOptions}
                  onChange={(value) => {
                    setContextId(value);
                    setPicked("");
                  }}
                  rtl={rtl}
                  fullWidth
                  ariaLabel={t("aiContextLabel")}
                />
              </div>

              <div className="border-b vs-brand-divider px-4 py-4 dark:border-brand-800/30 md:px-5">
                <SmartReplyBar
                  showControls
                  subject="AI tab"
                  autoGenerate={false}
                  triggerKey={`preview:${contextId}`}
                  recentTexts={previewContext}
                  onPick={(s) => setPicked(s)}
                />
              </div>

              <div className="border-t vs-brand-divider p-4 text-sm dark:border-brand-800/30 md:px-5">
                {picked ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                      {t("aiPagePickedLabel")}
                    </span>
                    <span className="rounded-lg vs-chip-current px-2.5 py-1 text-sm">
                      {picked}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm font-semibold text-muted">{t("aiPageTapChipHint")}</span>
                )}
              </div>
            </section>
          </div>

          <div className={cn(tab !== "translate" && "hidden")} aria-hidden={tab !== "translate"}>
            <AiTranslatePanel
              langOptions={langOptions}
              isArabic={Boolean(isArabic)}
              rtl={rtl}
            />
          </div>

          <div className={cn(tab !== "tour" && "hidden")} aria-hidden={tab !== "tour"}>
            <section
              data-tour="ai-tour-panel"
              className="vs-settings-card grid gap-4 !p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:!p-6"
            >
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-ink">{t("aiTourPanelTitle")}</h2>
                <p className="mt-1 text-xs font-semibold leading-relaxed text-muted md:text-sm">
                  {t("aiTourPanelHint")}
                </p>
              </div>
              <button
                type="button"
                data-tour="ai-tour-start"
                onClick={() => startTour()}
                className="vs-btn-primary-inline w-full shrink-0 px-5 py-2.5 sm:w-auto"
              >
                {t("aiTourStart")}
              </button>
            </section>
          </div>
        </div>
      </DashboardPageLayout>
    </>
  );
}
