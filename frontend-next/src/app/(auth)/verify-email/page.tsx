"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import { formatApiError, formatApiMessage } from "@/lib/apiError";
import { showAuthErrorToast, showAuthSuccessToast } from "@/lib/authToast";
import AuthFormHeader from "@/components/marketing/AuthFormHeader";

function VerifyEmailInner() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const token = String(searchParams.get("token") || "").trim();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      const text = t("verifyEmailMissingToken");
      setMsg(text);
      showAuthErrorToast(text, "verify-missing-token");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.post("/auth/verify-email", { token });
        if (!cancelled) {
          const apiMessage =
            data &&
            typeof data === "object" &&
            "message" in data &&
            typeof (data as { message?: string }).message === "string"
              ? (data as { message: string }).message.trim()
              : "";
          const text = formatApiMessage(
            apiMessage,
            t,
            "verifyEmailSuccessToast",
          );
          setStatus("ok");
          setMsg(text);
          showAuthSuccessToast(text, "verify-ok");
        }
      } catch (e) {
        if (!cancelled) {
          const text = formatApiError(e, t, "verifyEmailFailed");
          setStatus("error");
          setMsg(text);
          showAuthErrorToast(text, "verify-failed");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, t]);

  const StatusIcon =
    status === "loading"
      ? null
      : status === "ok"
        ? CheckCircle2
        : XCircle;

  return (
    <div className="text-center">
      <AuthFormHeader title={t("verifyEmailTitle")} centered />

      {status === "loading" ? (
        <div className="flex flex-col items-center gap-3 py-2">
          <Loader2 className="h-10 w-10 animate-spin vega-brand-text" />
          <p className="text-sm vega-muted">{t("verifyEmailVerifying")}</p>
        </div>
      ) : StatusIcon ? (
        <>
          <div
            className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border ${
              status === "ok"
                ? "border-brand-400/40 bg-brand-500/10 text-brand-600 dark:text-brand-200"
                : "border-red-400/40 bg-red-500/10 text-red-600 dark:text-red-300"
            }`}
          >
            <StatusIcon className="h-7 w-7" />
          </div>
          {msg ? (
            <p
              className={`text-sm ${
                status === "ok"
                  ? "text-brand-700 dark:text-brand-200"
                  : "text-red-600 dark:text-red-400"
              }`}
              role={status === "error" ? "alert" : "status"}
            >
              {msg}
            </p>
          ) : null}
        </>
      ) : null}

      <div className="mt-8 border-t vega-hairline pt-5">
        <Link href="/login" className="vega-btn-accent inline-flex h-11 min-w-[10rem]">
          {t("login")}
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-12">
          <Loader2 className="h-10 w-10 animate-spin vega-brand-text" />
        </div>
      }
    >
      <VerifyEmailInner />
    </Suspense>
  );
}
