"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { formatApiError } from "@/lib/apiError";
import { showAppErrorToast } from "@/lib/appToast";
import { UsersRound, Radio, LogIn } from "lucide-react";

export default function JoinInvitePage() {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const token = params?.token ? String(params.token) : "";
  const [preview, setPreview] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      const message = t("joinInvalidOrExpired");
      setErr(message);
      showAppErrorToast(message, "join-invalid-token");
      setLoading(false);
      return;
    }
    let c = false;
    api
      .get(`/join/${encodeURIComponent(token)}`)
      .then(({ data }) => {
        if (!c) setPreview(data);
      })
      .catch(() => {
        if (!c) {
          const message = t("joinInvalidOrExpired");
          setErr(message);
          showAppErrorToast(message, "join-preview-failed");
        }
      })
      .finally(() => {
        if (!c) setLoading(false);
      });
    return () => {
      c = true;
    };
  }, [token, t]);

  const join = async () => {
    const auth =
      typeof window !== "undefined" && localStorage.getItem("token");
    if (!auth) {
      const nextPath = `/join/${token}`;
      router.push(`/login?next=${encodeURIComponent(nextPath)}`);
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const { data } = await api.post(
        `/join/${encodeURIComponent(token)}`,
        {},
      );
      const id = data?._id;
      if (id) router.push(`/chats/${id}`);
      else {
        const message = t("joinFailed");
        setErr(message);
        showAppErrorToast(message, "join-failed");
      }
    } catch (e) {
      const message = formatApiError(e, t, "joinFailed");
      setErr(message);
      showAppErrorToast(message, "join-api-failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 py-12">
      <div className="vs-surface-card w-full max-w-md p-8">
        {loading ? (
          <div className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-900" />
        ) : err && !preview ? (
          <>
            <h1 className="text-xl font-semibold tracking-tight text-ink">
              {t("joinTitle")}
            </h1>
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{err}</p>
            <Link
              href="/chats"
              className="mt-4 inline-block text-sm font-semibold text-brand-700 dark:text-brand-300"
            >
              {t("openChat")}
            </Link>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                  preview?.isChannel
                    ? "bg-brand-100 text-brand-800 dark:bg-gradient-to-br dark:from-brand-900/45 dark:to-red-950/30 dark:text-brand-100"
                    : "bg-brand-100 text-brand-800 dark:bg-gradient-to-br dark:from-brand-900/45 dark:to-red-950/30 dark:text-brand-100"
                }`}
              >
                {preview?.isChannel ? (
                  <Radio className="h-6 w-6" />
                ) : (
                  <UsersRound className="h-6 w-6" />
                )}
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold text-ink">
                  {preview?.name || t("joinTitle")}
                </h1>
                <p className="text-xs text-muted">
                  {preview?.isChannel ? t("navChannels") : t("navGroups")} ·{" "}
                  {preview?.memberCount != null
                    ? t("joinMemberCount", { count: preview.memberCount })
                    : ""}
                </p>
              </div>
            </div>
            {preview?.description ? (
              <p className="mt-4 text-sm text-muted">{preview.description}</p>
            ) : null}
            {err ? (
              <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                {err}
              </p>
            ) : null}
            <button
              type="button"
              disabled={busy}
              onClick={join}
              className="vs-btn-primary mt-6 gap-2"
            >
              {typeof window !== "undefined" &&
              localStorage.getItem("token") ? (
                <>{busy ? "…" : t("joinChatAction")}</>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  {t("joinSignInToContinue")}
                </>
              )}
            </button>
            {typeof window !== "undefined" &&
            !localStorage.getItem("token") ? (
              <p className="mt-4 text-center text-sm text-muted">
                <Link
                  href={`/signup?next=${encodeURIComponent(`/join/${token}`)}`}
                  className="font-semibold text-brand-700 hover:underline dark:text-brand-300"
                >
                  {t("joinCreateAccountInstead")}
                </Link>
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
