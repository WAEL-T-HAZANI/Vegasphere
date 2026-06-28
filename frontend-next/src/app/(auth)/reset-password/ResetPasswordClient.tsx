"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Loader2,
  Lock,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatApiError, formatApiMessage, mapResetApiError } from "@/lib/apiError";
import { showAuthErrorToast, showAuthSuccessToast } from "@/lib/authToast";
import AuthFormHeader from "@/components/marketing/AuthFormHeader";
import AuthField from "@/components/ui/AuthField";

function ResetPasswordInner() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlToken = String(searchParams.get("token") || "").trim();

  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState(false);
  const [tokenError, setTokenError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    if (urlToken) setToken(urlToken);
  }, [urlToken]);

  const tokenFromLink = Boolean(urlToken);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedToken = token.trim();
    const nextTokenError = !trimmedToken ? t("resetPasswordTokenRequired") : "";
    const nextPasswordError =
      password.length < 8 ? t("passwordMinLengthError") : "";

    if (nextTokenError || nextPasswordError) {
      setTokenError(nextTokenError);
      setPasswordError(nextPasswordError);
      return;
    }
    setTokenError("");
    setPasswordError("");

    setLoading(true);

    try {
      const { data } = await api.post("/auth/reset-password", {
        token: trimmedToken,
        password,
      });

      const message =
        data && typeof data === "object" && "message" in data
          ? String((data as { message?: string }).message || "")
          : "";

      if (message) {
        setOk(true);
        showAuthSuccessToast(
          formatApiMessage(message, t, "resetPasswordSuccessToast"),
          "reset-ok",
        );
        setTimeout(() => router.replace("/login"), 2000);
        return;
      }

      showAuthErrorToast(t("errorOccurred"), "reset-no-message");
    } catch (e2) {
      const mapped = mapResetApiError(e2, t);
      if (mapped.token) setTokenError(mapped.token);
      if (mapped.password) setPasswordError(mapped.password);
      if (!mapped.token && !mapped.password) {
        showAuthErrorToast(
          mapped.toast || formatApiError(e2, t),
          "reset-api",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  if (ok) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-brand-400/40 bg-brand-500/10">
          <CheckCircle2 className="h-7 w-7 text-brand-600 dark:text-brand-200" />
        </div>
        <p
          className="text-sm text-brand-700 dark:text-brand-200"
          role="status"
        >
          {t("resetPasswordSuccessToast")}
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <AuthFormHeader
        title={t("resetPasswordTitle")}
        subtitle={
          tokenFromLink
            ? t("resetPasswordHintFromLink")
            : t("resetPasswordHint")
        }
      />

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {!tokenFromLink ? (
          <AuthField
            icon={KeyRound}
            id="rp-token"
            label={t("resetPasswordTokenLabel")}
            type="text"
            autoComplete="off"
            value={token}
            onChange={(v) => {
              setToken(v);
              if (tokenError) setTokenError("");
            }}
            mono
            error={tokenError}
          />
        ) : tokenError ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {tokenError}
          </p>
        ) : null}

        <AuthField
          icon={Lock}
          id="rp-pass"
          label={t("resetPasswordNewLabel")}
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(v) => {
            setPassword(v);
            if (passwordError) setPasswordError("");
          }}
          error={passwordError}
        />

        <button
          type="submit"
          disabled={loading}
          className="vega-btn-accent group h-12 w-full gap-2 disabled:opacity-55"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            t("resetPasswordSubmit")
          )}
          {!loading ? (
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
          ) : null}
        </button>
      </form>

      <div className="mt-6 border-t vega-hairline pt-5 text-center">
        <Link
          href="/login"
          className="vega-btn-ghost inline-flex px-5 py-2 text-xs"
        >
          {t("forgotPasswordBack")}
        </Link>
      </div>
    </motion.div>
  );
}

export default function ResetPasswordClient() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-12">
          <Loader2 className="h-10 w-10 animate-spin vega-brand-text" />
        </div>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}
