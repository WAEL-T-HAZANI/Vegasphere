"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { LogIn, PhoneCall } from "lucide-react";
import { api } from "@/lib/api";
import { formatApiError } from "@/lib/apiError";

type CallInvitePreview = {
  token?: string;
  mode?: string;
  title?: string;
  conversationId?: { _id?: string; name?: string };
  requiresLogin?: boolean;
};

export default function CallInvitePage() {
  const params = useParams();
  const token = String(params?.token ?? "");
  const router = useRouter();
  const { t } = useTranslation();
  const [state, setState] = useState<"loading" | "login" | "ready" | "error">(
    "loading",
  );
  const [invite, setInvite] = useState<CallInvitePreview | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!token) {
      setState("error");
      setErr(t("callInviteInvalidHint"));
      return;
    }

    let alive = true;
    (async () => {
      try {
        const hasAuth =
          typeof window !== "undefined" && Boolean(localStorage.getItem("token"));

        if (hasAuth) {
          const { data } = await api.get<CallInvitePreview>(
            `/calls/invite/${encodeURIComponent(token)}/resolve`,
          );
          if (!alive) return;
          setInvite(data || null);
          setState("ready");
          return;
        }

        const { data } = await api.get<CallInvitePreview>(
          `/calls/invite/${encodeURIComponent(token)}`,
        );
        if (!alive) return;
        setInvite(data || null);
        setState("login");
      } catch (e) {
        if (!alive) return;
        setState("error");
        setErr(formatApiError(e, t, "callInviteInvalidHint"));
      }
    })();

    return () => {
      alive = false;
    };
  }, [token, t]);

  useEffect(() => {
    if (state !== "ready" || !invite?.conversationId?._id) return;
    const mode = invite.mode === "video" ? "video" : "audio";
    router.replace(
      `/chat/${invite.conversationId._id}?autocall=${mode}&invite=${encodeURIComponent(token)}`,
    );
  }, [state, invite, router, token]);

  const loginHref = `/login?next=${encodeURIComponent(`/call/${token}`)}`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <div className="vs-surface-card w-full max-w-md p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200">
          <PhoneCall className="h-6 w-6" />
        </div>
        <div className="mt-4 text-lg font-semibold text-ink">
          {state === "error"
            ? t("callInviteInvalidTitle")
            : state === "login"
              ? t("callInviteLoginTitle")
              : t("callInviteJoiningTitle")}
        </div>
        <p className="mt-2 text-sm text-muted">
          {state === "error"
            ? err || t("callInviteInvalidHint")
            : invite?.title ||
              invite?.conversationId?.name ||
              (state === "login"
                ? t("callInviteLoginHint")
                : t("callInviteJoiningHint"))}
        </p>
        {state === "login" ? (
          <Link
            href={loginHref}
            className="vs-btn-primary-sm mt-6 inline-flex items-center justify-center gap-2 px-5 py-2.5"
          >
            <LogIn className="h-4 w-4" aria-hidden />
            {t("callInviteLoginAction")}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
