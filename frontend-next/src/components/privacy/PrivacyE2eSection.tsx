"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { formatApiError } from "@/lib/apiError";
import { showAuthErrorToast, showAuthSuccessToast } from "@/lib/authToast";
import { ensureE2eKeypair, getPublicKeyBase64 } from "@/lib/e2eClient";

type PrivacyE2eSectionProps = {
  userId?: string;
};

export default function PrivacyE2eSection({ userId }: PrivacyE2eSectionProps) {
  const { t } = useTranslation();
  const [e2eSyncing, setE2eSyncing] = useState(false);
  const [e2eServerKey, setE2eServerKey] = useState("");

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get<{ e2ePublicKey?: string }>(
          "/user/e2e-public-key",
        );
        if (!cancelled) {
          setE2eServerKey(String(data?.e2ePublicKey || "").trim());
        }
      } catch {
        if (!cancelled) setE2eServerKey("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const syncE2e = useCallback(async () => {
    if (!userId) return;
    setE2eSyncing(true);
    try {
      ensureE2eKeypair(userId);
      const pub = getPublicKeyBase64(userId);
      await api.put("/user/e2e-public-key", { publicKey: pub });
      setE2eServerKey(pub);
      showAuthSuccessToast(t("profileE2eSynced"), "auth-success");
    } catch (e) {
      showAuthErrorToast(formatApiError(e, t), "auth-error");
    } finally {
      setE2eSyncing(false);
    }
  }, [t, userId]);

  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-muted">{t("privacyE2eHint")}</p>
      <p className="text-xs font-semibold text-muted">
        {e2eServerKey
          ? t("profileE2eServerKey", { key: `${e2eServerKey.slice(0, 12)}…` })
          : t("profileE2eNotSet")}
      </p>
      <button
        type="button"
        disabled={e2eSyncing || !userId}
        className="vs-btn-outline-sm w-full justify-center px-4 py-2.5 font-bold disabled:opacity-60 sm:w-auto"
        onClick={syncE2e}
      >
        {e2eSyncing ? "…" : t("profileE2eGenerate")}
      </button>
    </div>
  );
}
