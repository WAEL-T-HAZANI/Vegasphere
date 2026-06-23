"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useAppDispatch } from "@/store/hooks";

import {
  ArrowRight,
  Loader2,
  Lock,
  Mail,
  UserRound,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatApiError, mapSignupApiError } from "@/lib/apiError";
import { validateEmailField } from "@/lib/authValidation";
import { showAuthErrorToast, showAuthSuccessToast } from "@/lib/authToast";
import { setToken } from "@/store/slices/authSlice";
import AuthFormHeader from "@/components/marketing/AuthFormHeader";
import AuthField from "@/components/ui/AuthField";

type PostSignup = {
  emailVerified: boolean;
  debugVerifyToken?: string;
};

type FieldErrors = {
  name?: string;
  email?: string;
  password?: string;
  confirm?: string;
};

export default function SignupClient({ safeNext }) {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [postSignup, setPostSignup] = useState<PostSignup | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});

  const loginHref =
    safeNext && safeNext !== "/chats"
      ? `/login?next=${encodeURIComponent(safeNext)}`
      : "/login";

  const clearError = (key: keyof FieldErrors) => {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const finishSignup = (data: PostSignup) => {
    setLoading(false);
    if (data.debugVerifyToken || !data.emailVerified) {
      setPostSignup(data);
      showAuthSuccessToast(t("signupVerifyEmailToast"), "signup-verify");
      return;
    }
    showAuthSuccessToast(t("signupSuccessToast"), "signup-ok");
    router.replace(safeNext);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const nextErrors: FieldErrors = {};

    if (trimmedName.length < 3) {
      nextErrors.name = t("nameMinLengthError");
    } else if (/\d/.test(trimmedName)) {
      nextErrors.name = t("nameNoDigitsError");
    }

    if (!normalizedEmail) {
      nextErrors.email = t("loginFillEmailPassword");
    } else {
      const emailError = validateEmailField(normalizedEmail, t);
      if (emailError) nextErrors.email = emailError;
    }

    if (password.length < 6) {
      nextErrors.password = t("passwordMinLengthError");
    }

    if (!confirm) {
      nextErrors.confirm = t("confirmPasswordRequired");
    } else if (password !== confirm) {
      nextErrors.confirm = t("passwordsDoNotMatch");
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const { data } = await api.post("/auth/register", {
        name: trimmedName,
        email: normalizedEmail,
        password,
      });

      const token = data?.authtoken;
      if (!token) {
        showAuthErrorToast(t("errorOccurred"), "signup-no-token");
        setLoading(false);
        return;
      }

      dispatch(setToken(token));

      finishSignup({
        emailVerified: Boolean(data?.emailVerified),
        debugVerifyToken:
          typeof data?.debugVerifyToken === "string"
            ? data.debugVerifyToken
            : undefined,
      });
    } catch (e2) {
      const mapped = mapSignupApiError(e2, t);
      const nextErrors: FieldErrors = {};
      if (mapped.name) nextErrors.name = mapped.name;
      if (mapped.email) nextErrors.email = mapped.email;
      if (mapped.password) nextErrors.password = mapped.password;

      if (Object.keys(nextErrors).length > 0) {
        setErrors(nextErrors);
      } else if (mapped.toast) {
        showAuthErrorToast(mapped.toast, "signup-api");
      } else {
        showAuthErrorToast(formatApiError(e2, t), "signup-api");
      }
      setLoading(false);
    }
  };

  if (postSignup) {
    const tok = postSignup.debugVerifyToken;
    const verifyHref = tok
      ? `/verify-email?token=${encodeURIComponent(tok)}`
      : null;

    return (
      <div>
        <AuthFormHeader
          title={t("signup")}
          subtitle={t("signupVerifyEmailToast")}
        />

        {!tok ? (
          <p className="mb-6 text-sm vega-muted">{t("forgotPasswordCheckInbox")}</p>
        ) : null}

        {tok && verifyHref ? (
          <div className="rounded-2xl border vega-hairline bg-[rgb(var(--vega-paper)/0.5)] p-5">
            <p className="text-xs vega-muted">{t("signupVerifyDevTokenHint")}</p>
            <pre className="mt-3 max-h-32 overflow-auto break-all rounded-xl border vega-hairline bg-[rgb(var(--vega-paper))] px-3 py-2 text-xs vega-muted">
              {tok}
            </pre>
            <Link
              href={verifyHref}
              className="vega-btn-accent mt-4 inline-flex h-11 w-full"
            >
              {t("continueToVerify")}
            </Link>
          </div>
        ) : null}

        <button
          type="button"
          className="vega-btn-accent mt-6 h-12 w-full"
          onClick={() => router.replace(safeNext)}
        >
          {t("signupContinueToApp")}
        </button>
      </div>
    );
  }

  return (
    <div>
      <AuthFormHeader
        kicker={t("signupNewAccountBadge")}
        title={t("signup")}
        subtitle={t("signupWorkspaceTagline")}
        compact
      />

      <form onSubmit={onSubmit} noValidate className="space-y-3">
        <AuthField
          compact
          icon={UserRound}
          id="name"
          label={t("nameLabel")}
          type="text"
          autoComplete="name"
          value={name}
          onChange={(v) => {
            setName(v);
            clearError("name");
          }}
          placeholder={t("namePlaceholder")}
          error={errors.name}
        />

        <AuthField
          compact
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
          compact
          icon={Lock}
          id="password"
          label={t("passwordLabel")}
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(v) => {
            setPassword(v);
            clearError("password");
            if (errors.confirm) clearError("confirm");
          }}
          placeholder={t("passwordPlaceholder")}
          error={errors.password}
        />

        <AuthField
          compact
          icon={Lock}
          id="confirm"
          label={t("confirmPasswordLabel")}
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(v) => {
            setConfirm(v);
            clearError("confirm");
          }}
          placeholder={t("confirmPasswordPlaceholder")}
          error={errors.confirm}
        />

        <button
          type="submit"
          disabled={loading}
          className="vega-btn-accent group h-11 w-full gap-2 disabled:cursor-not-allowed disabled:opacity-55"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("signup")}
          {!loading ? (
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
          ) : null}
        </button>
      </form>

      <p className="vega-ar-copy mt-4 border-t vega-hairline pt-3 text-center text-sm vega-muted">
        {t("alreadyHaveAccount")}{" "}
        <Link
          href={loginHref}
          className="font-semibold text-[rgb(var(--vega-ink))] transition hover:vega-brand-text"
        >
          {t("login")}
        </Link>
      </p>
    </div>
  );
}
