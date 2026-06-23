"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { Copy, ExternalLink, QrCode, Share2 } from "lucide-react";
import SettingsSectionHeading from "@/components/settings/SettingsSectionHeading";
import { showAppToast } from "@/lib/appToast";
import { buildProfileUrl, copyProfileLink } from "@/lib/profileShare";

type ProfileShareSectionProps = {
  userId?: string;
  rtl?: boolean;
};

export default function ProfileShareSection({
  userId,
  rtl = false,
}: ProfileShareSectionProps) {
  const { t } = useTranslation();
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrLoading, setQrLoading] = useState(false);

  const profileUrl = useMemo(() => {
    if (!userId) return "";
    return buildProfileUrl(userId);
  }, [userId]);

  useEffect(() => {
    if (!profileUrl) {
      setQrDataUrl("");
      setQrLoading(false);
      return;
    }
    let alive = true;
    setQrLoading(true);
    import("qrcode")
      .then(({ default: QRCode }) =>
        QRCode.toDataURL(profileUrl, {
          width: 184,
          margin: 1,
          color: { dark: "#5c1030", light: "#ffffff" },
        }),
      )
      .then((dataUrl) => {
        if (alive) setQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (alive) setQrDataUrl("");
      })
      .finally(() => {
        if (alive) setQrLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [profileUrl]);

  const onCopy = async () => {
    if (!userId) return;
    try {
      await copyProfileLink(userId);
      showAppToast({ id: "profile-share-copy", body: t("profileShareCopied") });
    } catch {
      showAppToast({
        id: "profile-share-copy-err",
        body: t("profileShareCopyFailed"),
      });
    }
  };

  if (!userId) return null;

  return (
    <section
      dir={rtl ? "rtl" : "ltr"}
      className="vs-settings-card overflow-hidden !p-0"
    >
      <div className="vs-profile-share-head flex flex-col gap-3 px-5 py-4 md:flex-row md:items-start md:justify-between md:px-6">
        <SettingsSectionHeading
          icon={Share2}
          title={t("profileShareTitle")}
          hint={t("profileShareHint")}
        />
        <Link
          href={`/user/${encodeURIComponent(userId)}`}
          className="vs-btn-outline-sm inline-flex w-full shrink-0 items-center justify-center gap-1.5 self-start px-4 py-2.5 sm:w-auto"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          {t("profilePreviewLink")}
        </Link>
      </div>

      <div className="vs-profile-share-body">
        <div className="vs-profile-share-stack">
          <div className="w-full space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {t("profileShareLinkLabel")}
            </p>

            <div className="vs-profile-share-link-group">
              <input
                className="vs-profile-share-link-input"
                readOnly
                value={profileUrl}
                aria-label={t("profileShareLinkLabel")}
                onFocus={(e) => e.currentTarget.select()}
              />
              <button
                type="button"
                onClick={() => void onCopy()}
                className="vs-profile-share-link-copy"
              >
                <Copy className="h-3.5 w-3.5" aria-hidden />
                <span className="hidden sm:inline">{t("profileShareCopy")}</span>
              </button>
            </div>
          </div>

          <aside
            className="vs-profile-share-qr-panel"
            aria-label={t("profileShareQrAlt")}
          >
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-ink">
              <QrCode className="h-4 w-4 vega-brand-text" aria-hidden />
              {t("profileShareQrTitle")}
            </div>

            <div className="vs-profile-share-qr-frame">
              {qrLoading ? (
                <div className="vs-profile-share-qr-placeholder animate-pulse">
                  {t("loading")}
                </div>
              ) : qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrDataUrl}
                  alt={t("profileShareQrAlt")}
                  className="h-[184px] w-[184px] rounded-xl"
                />
              ) : (
                <div className="vs-profile-share-qr-placeholder">
                  {t("profileShareQrUnavailable")}
                </div>
              )}
            </div>

            <p className="max-w-[220px] text-[11px] leading-relaxed text-muted">
              {t("profileShareQrHint")}
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
}
