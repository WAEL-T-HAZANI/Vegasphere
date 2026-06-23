"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useAppDispatch } from "@/store/hooks";

import { ArrowRight, KeyRound, Loader2, Lock, Mail } from "lucide-react";
import { api } from "@/lib/api";
import { apiErrorRequiresPin, formatApiError, mapLoginApiError } from "@/lib/apiError";
import { validateEmailField } from "@/lib/authValidation";
import { showAuthErrorToast, showAuthSuccessToast } from "@/lib/authToast";
import { setToken, setUser } from "@/store/slices/authSlice";
import { syncUserNotificationPrefs } from "@/lib/syncUserNotificationPrefs";
import AuthFormHeader from "@/components/marketing/AuthFormHeader";
import VegaLoadingScreen from "@/components/marketing/VegaLoadingScreen";
import AuthField from "@/components/ui/AuthField";

type FieldErrors = {
  email?: string;
  password?: string;
  pin?: string;
};

export default function LoginClient({ safeNext }) {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [needsPin, setNeedsPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const signupHref =
    safeNext && safeNext !== "/chats"
      ? `/signup?next=${encodeURIComponent(safeNext)}`
      : "/signup";

  const clearError = (key: keyof FieldErrors) => {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    const nextErrors: FieldErrors = {};

    const emailError = validateEmailField(
      normalizedEmail,
      t,
      "loginFillEmailPassword",
    );
    if (emailError) nextErrors.email = emailError;

    if (!password) {
      nextErrors.password = t("loginFillEmailPassword");
    }

    if (needsPin && !pin.trim()) {
      nextErrors.pin = t("twoStepPinRequired");
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const body: { email: string; password: string; pin?: string } = {
        email: normalizedEmail,
        password,
      };
      if (needsPin && pin.trim()) body.pin = pin.trim();

      const { data } = await api.post("/auth/login", body);

      const token = data?.authtoken;
      if (!token) {
        showAuthErrorToast(t("errorOccurred"), "login-no-token");
        setLoading(false);
        return;
      }

      if (data?.user) {
        dispatch(setUser(data.user));
        syncUserNotificationPrefs(data.user, dispatch);
      }
      dispatch(setToken(token));
      showAuthSuccessToast(t("loginSuccessToast"), "login-ok");
      router.replace(safeNext);
      return;
    } catch (e2) {
      const pinRequired = apiErrorRequiresPin(e2);
      if (pinRequired) setNeedsPin(true);

      const mapped = mapLoginApiError(e2, t, {
        pinRequired,
        pinValue: pin,
      });
      const nextErrors: FieldErrors = {};
      if (mapped.email) nextErrors.email = mapped.email;
      if (mapped.password) nextErrors.password = mapped.password;
      if (mapped.pin) nextErrors.pin = mapped.pin;

      if (Object.keys(nextErrors).length > 0) {
        setErrors(nextErrors);
      } else if (mapped.toast) {
        showAuthErrorToast(
          mapped.toast,
          pinRequired ? "login-pin" : "login-api",
        );
      } else {
        showAuthErrorToast(formatApiError(e2, t), "login-api");
      }
      setLoading(false);
    }
  };

  return (
    <>
      {loading ? (
        <div className="fixed inset-0 z-[200]">
          <VegaLoadingScreen />
        </div>
      ) : null}

      <div className="w-full">
        <AuthFormHeader
          kicker={t("welcomeBack")}
          title={t("login")}
          subtitle={t("loginWorkspaceTagline")}
        />

        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <AuthField
            icon={Mail}
            id="email"
            label={t("emailLabel")}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(v) => {
              setEmail(v);
              clearError("email");
            }}
            placeholder={t("emailPlaceholder")}
            error={errors.email}
          />

          <AuthField
            icon={Lock}
            id="password"
            label={t("passwordLabel")}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(v) => {
              setPassword(v);
              clearError("password");
            }}
            placeholder={t("passwordPlaceholder")}
            error={errors.password}
          />

          {needsPin ? (
            <AuthField
              icon={KeyRound}
              id="pin"
              label={t("twoStepPinLabel")}
              type="password"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={pin}
              onChange={(v) => {
                setPin(v);
                clearError("pin");
              }}
              placeholder={t("twoStepPinPlaceholder")}
              error={errors.pin}
            />
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="vega-btn-accent group h-12 w-full gap-2 disabled:cursor-not-allowed disabled:opacity-55"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("login")}
            {!loading ? (
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
            ) : null}
          </button>
        </form>

        <div className="mt-6 flex flex-col gap-2.5 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3 border-t vega-hairline pt-4 sm:pt-5 text-sm">
          <Link
            href="/forgot-password"
            className="vega-muted transition hover:vega-brand-text"
          >
            {t("forgotPassword")}
          </Link>
          <Link href={signupHref} className="vega-btn-ghost w-full px-4 py-2 text-xs sm:w-auto">
            {t("signup")}
          </Link>
        </div>
      </div>
    </>
  );
}
