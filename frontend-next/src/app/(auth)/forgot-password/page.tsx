"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, Mail } from "lucide-react";
import { api } from "@/lib/api";
import { formatApiError, formatApiMessage } from "@/lib/apiError";
import { validateEmailField } from "@/lib/authValidation";
import { showAuthErrorToast, showAuthSuccessToast } from "@/lib/authToast";
import AuthFormHeader from "@/components/marketing/AuthFormHeader";
import AuthField from "@/components/ui/AuthField";

type ForgotDone = {
  message?: string;
  resetCode?: string;
  debugResetToken?: string;
};

export default function ForgotPasswordPage() {
  const { t } = useTranslation();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<ForgotDone | null>(null);
  const [emailError, setEmailError] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    const nextEmailError = validateEmailField(normalizedEmail, t);
    if (nextEmailError) {
      setEmailError(nextEmailError);
      return;
    }
    setEmailError("");

    setLoading(true);

    try {
      const { data } = await api.post("/auth/forgot-password", {
        email: normalizedEmail,
      });
      const payload = (data || {}) as ForgotDone;
      setDone(payload);
      showAuthSuccessToast(
        formatApiMessage(payload.message, t, "forgotPasswordSuccessToast"),
        "forgot-ok",
      );
    } catch (e2) {
      showAuthErrorToast(formatApiError(e2, t), "forgot-api");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    const tok = done.resetCode || done.debugResetToken;
    const href = tok
      ? `/reset-password?token=${encodeURIComponent(tok)}`
      : "/reset-password";

    return (
      <motion.div
        initial={{ y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <AuthFormHeader
          title={t("forgotPasswordTitle")}
          subtitle={formatApiMessage(
            done.message,
            t,
            "forgotPasswordSuccessToast",
          )}
        />

        {!tok ? (
          <p className="mb-6 text-sm vega-muted">{t("forgotPasswordCheckInbox")}</p>
        ) : null}

        {tok ? (
          <div className="rounded-2xl border vega-hairline bg-[rgb(var(--vega-paper)/0.5)] p-5">
            <p className="text-xs vega-muted">{t("forgotPasswordDevTokenHint")}</p>
            <pre className="mt-3 max-h-32 overflow-auto break-all rounded-xl border vega-hairline bg-[rgb(var(--vega-paper))] px-3 py-2 text-xs vega-muted">
              {tok}
            </pre>
            <Link href={href} className="vega-btn-accent mt-4 inline-flex h-11 w-full">
              {t("continueToReset")}
            </Link>
          </div>
        ) : null}

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

  return (
    <motion.div
      initial={{ y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
      <AuthFormHeader
        title={t("forgotPasswordTitle")}
        subtitle={t("forgotPasswordHint")}
      />

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <AuthField
          icon={Mail}
          id="fp-email"
          label={t("emailLabel")}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(v) => {
            setEmail(v);
            if (emailError) setEmailError("");
          }}
          placeholder={t("emailPlaceholder")}
          error={emailError}
        />

        <button
          type="submit"
          disabled={loading}
          className="vega-btn-accent group h-12 w-full gap-2 disabled:opacity-55"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            t("forgotPasswordSubmit")
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
