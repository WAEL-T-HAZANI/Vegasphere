"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  KeyRound,
  Mail,
  ShieldCheck,
  Lock,
  MonitorSmartphone,
  Trash2,
  Smartphone,
  Laptop,
  Tablet,
} from "lucide-react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";

import { authClient, userClient } from "@/lib/clients";
import { formatApiError } from "@/lib/apiError";
import { showAuthErrorToast, showAuthSuccessToast } from "@/lib/authToast";
import AccountPageShell from "@/components/account/AccountPageShell";
import ProtectedPageGate from "@/components/layout/ProtectedPageGate";
import SettingsSectionHeading from "@/components/settings/SettingsSectionHeading";
import { setUser, logout } from "@/store/slices/authSlice";
import { cn } from "@/lib/classNames";
import EmailChangeSection from "@/components/privacy/EmailChangeSection";
import { DeleteAccountDialog } from "@/components/chat/conversation/MessageDialogs";
import EmailVerificationSection from "@/components/privacy/EmailVerificationSection";
import TwoStepSection from "@/components/privacy/TwoStepSection";
import AccountPrivacySection from "@/components/privacy/AccountPrivacySection";

const sectionMotion = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
};

function formatSessionTime(value, locale) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale || undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function SessionDeviceIcon({ deviceType }) {
  if (deviceType === "mobile") return <Smartphone className="h-5 w-5" aria-hidden />;
  if (deviceType === "tablet") return <Tablet className="h-5 w-5" aria-hidden />;
  return <Laptop className="h-5 w-5" aria-hidden />;
}

export default function PrivacyPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const status = useAppSelector((s) => s.auth.status);
  const rtl = i18n.dir() === "rtl";

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passBusy, setPassBusy] = useState(false);

  const [sessions, setSessions] = useState([]);
  const [sessionsBusy, setSessionsBusy] = useState(false);
  const [sessionActionId, setSessionActionId] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);

  const [lastSeenVisibility, setLastSeenVisibility] = useState("everyone");
  const [onlineVisibility, setOnlineVisibility] = useState("everyone");
  const [profilePhotoVisibility, setProfilePhotoVisibility] = useState("everyone");
  const [aboutVisibility, setAboutVisibility] = useState("everyone");
  const [callPrivacy, setCallPrivacy] = useState("everyone");
  const [searchDiscoverable, setSearchDiscoverable] = useState("everyone");
  const [groupAddPermission, setGroupAddPermission] = useState("everyone");
  const [readReceiptsEnabled, setReadReceiptsEnabled] = useState(true);
  const [typingIndicatorsEnabled, setTypingIndicatorsEnabled] = useState(true);
  const [loginAlertsEnabled, setLoginAlertsEnabled] = useState(true);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const privacySaveGenRef = useRef(0);

  const refreshUser = useCallback(async () => {
    const { data } = await authClient.getMe();
    dispatch(setUser(data));
    return data;
  }, [dispatch]);

  const syncPrivacyFromUser = useCallback((u) => {
    if (!u) return;
    setLastSeenVisibility(
      u.lastSeenVisibility || (u.showLastSeen === false ? "nobody" : "everyone"),
    );
    setOnlineVisibility(
      u.onlineVisibility || (u.showOnlineStatus === false ? "nobody" : "everyone"),
    );
    setProfilePhotoVisibility(u.profilePhotoVisibility || "everyone");
    setAboutVisibility(u.aboutVisibility || "everyone");
    setCallPrivacy(u.callPrivacy || "everyone");
    setSearchDiscoverable(u.searchDiscoverable || "everyone");
    setGroupAddPermission(u.groupAddPermission || "everyone");
    setReadReceiptsEnabled(u.readReceiptsEnabled !== false);
    setTypingIndicatorsEnabled(u.typingIndicatorsEnabled !== false);
    setLoginAlertsEnabled(u.loginAlertsEnabled !== false);
  }, []);

  const loadSessions = useCallback(async () => {
    setSessionsBusy(true);
    try {
      const { data } = await authClient.listSessions();
      setSessions(Array.isArray(data) ? data : []);
    } catch (e) {
      setSessions([]);
      showAuthErrorToast(formatApiError(e, t, "errorOccurred"));
    } finally {
      setSessionsBusy(false);
    }
  }, [t]);

  useEffect(() => {
    if (status !== "authenticated" || !user?._id) return;
    syncPrivacyFromUser(user);
    loadSessions();
  }, [loadSessions, status, syncPrivacyFromUser, user, user?._id]);

  type PrivacyPatch = Partial<{
    lastSeenVisibility: string;
    onlineVisibility: string;
    profilePhotoVisibility: string;
    aboutVisibility: string;
    callPrivacy: string;
    searchDiscoverable: string;
    groupAddPermission: string;
    readReceiptsEnabled: boolean;
    typingIndicatorsEnabled: boolean;
    loginAlertsEnabled: boolean;
  }>;

  const buildPrivacyPayload = useCallback(
    (patch: PrivacyPatch = {}) => ({
      lastSeenVisibility:
        patch.lastSeenVisibility !== undefined
          ? patch.lastSeenVisibility
          : lastSeenVisibility,
      onlineVisibility:
        patch.onlineVisibility !== undefined ? patch.onlineVisibility : onlineVisibility,
      profilePhotoVisibility:
        patch.profilePhotoVisibility !== undefined
          ? patch.profilePhotoVisibility
          : profilePhotoVisibility,
      aboutVisibility:
        patch.aboutVisibility !== undefined ? patch.aboutVisibility : aboutVisibility,
      callPrivacy: patch.callPrivacy !== undefined ? patch.callPrivacy : callPrivacy,
      searchDiscoverable:
        patch.searchDiscoverable !== undefined
          ? patch.searchDiscoverable
          : searchDiscoverable,
      groupAddPermission:
        patch.groupAddPermission !== undefined
          ? patch.groupAddPermission
          : groupAddPermission,
      readReceiptsEnabled:
        patch.readReceiptsEnabled !== undefined
          ? patch.readReceiptsEnabled
          : readReceiptsEnabled,
      typingIndicatorsEnabled:
        patch.typingIndicatorsEnabled !== undefined
          ? patch.typingIndicatorsEnabled
          : typingIndicatorsEnabled,
      loginAlertsEnabled:
        patch.loginAlertsEnabled !== undefined
          ? patch.loginAlertsEnabled
          : loginAlertsEnabled,
    }),
    [
      lastSeenVisibility,
      onlineVisibility,
      profilePhotoVisibility,
      aboutVisibility,
      callPrivacy,
      searchDiscoverable,
      groupAddPermission,
      readReceiptsEnabled,
      typingIndicatorsEnabled,
      loginAlertsEnabled,
    ],
  );

  const persistPrivacy = useCallback(
    async (patch: PrivacyPatch = {}) => {
      const gen = ++privacySaveGenRef.current;
      setSavingPrivacy(true);
      try {
        await userClient.updateProfile(buildPrivacyPayload(patch));
        const data = await refreshUser();
        if (gen !== privacySaveGenRef.current) return;
        syncPrivacyFromUser(data);
      } catch (err) {
        if (gen !== privacySaveGenRef.current) return;
        showAuthErrorToast(formatApiError(err, t), "auth-error");
        syncPrivacyFromUser(user);
      } finally {
        if (gen === privacySaveGenRef.current) setSavingPrivacy(false);
      }
    },
    [buildPrivacyPayload, refreshUser, syncPrivacyFromUser, t, user],
  );

  const savePassword = async (e) => {
    e.preventDefault();
    if (!oldPassword.trim() || !newPassword.trim()) {
      showAuthErrorToast(t("settingsPasswordFillBoth"), "auth-error");
      return;
    }
    if (newPassword.trim().length < 8) {
      showAuthErrorToast(t("passwordMinLengthError"), "auth-error");
      return;
    }
    setPassBusy(true);
    try {
      await userClient.updateProfile({
        oldpassword: oldPassword,
        newpassword: newPassword,
      });
      setOldPassword("");
      setNewPassword("");
      await refreshUser();
      showAuthSuccessToast(t("settingsPasswordUpdated"), "auth-success");
    } catch (err) {
      const er = formatApiError(err, t);
      showAuthErrorToast(
        String(er).toLowerCase().includes("credential")
          ? t("settingsPasswordWrong")
          : er,
        "auth-error",
      );
    } finally {
      setPassBusy(false);
    }
  };

  const revokeOneSession = async (sessionId) => {
    setSessionActionId(sessionId);
    try {
      await authClient.revokeSession(sessionId);
      await loadSessions();
      showAuthSuccessToast(t("settingsSessionsRevokedOne"), "auth-success");
    } catch (err) {
      showAuthErrorToast(formatApiError(err, t), "auth-error");
    } finally {
      setSessionActionId("");
    }
  };

  const signOutCurrentDevice = async () => {
    const ok =
      typeof window !== "undefined"
        ? window.confirm(t("settingsSessionsSignOutCurrentConfirm"))
        : false;
    if (!ok) return;
    setSessionActionId("current");
    try {
      await authClient.revokeCurrentSession();
      dispatch(logout());
      router.push("/login");
    } catch (err) {
      showAuthErrorToast(formatApiError(err, t), "auth-error");
      setSessionActionId("");
    }
  };

  const revokeOthers = async () => {
    setSessionActionId("others");
    try {
      await authClient.revokeOtherSessions();
      await loadSessions();
      showAuthSuccessToast(t("settingsSessionsRevokedOthers"), "auth-success");
    } catch (err) {
      showAuthErrorToast(formatApiError(err, t), "auth-error");
    } finally {
      setSessionActionId("");
    }
  };

  const deleteAccount = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await userClient.deleteAccount();
      try {
        await authClient.revokeCurrentSession();
      } catch {}
      dispatch(logout());
      router.push("/login");
    } catch (err) {
      showAuthErrorToast(formatApiError(err, t), "auth-error");
    } finally {
      setDeleting(false);
      setDeleteAccountOpen(false);
    }
  };

  const hasOtherSessions = sessions.some((row) => !row.current);

  return (
    <ProtectedPageGate titleKey="navAccountPrivacy" status={status} user={user}>
      <AccountPageShell
        title={t("privacyPageTitle")}
        hint={t("privacyPageHint")}
        mainClassName="pb-safe"
      >
            <motion.section
              {...sectionMotion}
              transition={{ duration: 0.2 }}
              id="password"
              className="vs-settings-card space-y-4"
            >
              <SettingsSectionHeading
                icon={KeyRound}
                title={t("settingsPasswordTitle")}
                hint={t("settingsPasswordHint")}
              />
              <form onSubmit={savePassword} className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5 text-xs font-semibold text-muted">
                  {t("settingsCurrentPassword")}
                  <input
                    type="password"
                    autoComplete="current-password"
                    className="vs-input"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold text-muted">
                  {t("settingsNewPassword")}
                  <input
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    className="vs-input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </label>
                <button
                  type="submit"
                  disabled={passBusy}
                  className="vs-btn-primary sm:col-span-2"
                >
                  {passBusy ? "…" : t("settingsPasswordSave")}
                </button>
              </form>
            </motion.section>

            <motion.section
              {...sectionMotion}
              transition={{ duration: 0.2, delay: 0.02 }}
              id="email-change"
              className="vs-settings-card space-y-4"
            >
              <SettingsSectionHeading
                icon={Mail}
                title={t("changeEmailTitle")}
                hint={t("changeEmailHint")}
              />
              <EmailChangeSection user={user} onUserRefresh={refreshUser} />
            </motion.section>

            <motion.section
              {...sectionMotion}
              transition={{ duration: 0.2, delay: 0.04 }}
              id="email-verify"
              className="vs-settings-card space-y-4"
            >
              <SettingsSectionHeading
                icon={ShieldCheck}
                title={t("emailVerificationTitle")}
                hint={t("emailVerificationHint")}
              />
              <EmailVerificationSection user={user} />
            </motion.section>

            <motion.section
              {...sectionMotion}
              transition={{ duration: 0.2, delay: 0.06 }}
              id="two-step"
              className="vs-settings-card space-y-4"
            >
              <SettingsSectionHeading
                icon={Lock}
                title={t("twoStepTitle")}
                hint={t("twoStepSectionHint")}
              />
              <TwoStepSection user={user} onUserRefresh={refreshUser} />
            </motion.section>

            <AccountPrivacySection
              t={t}
              rtl={rtl}
              userId={user?._id}
              lastSeenVisibility={lastSeenVisibility}
              setLastSeenVisibility={setLastSeenVisibility}
              onlineVisibility={onlineVisibility}
              setOnlineVisibility={setOnlineVisibility}
              profilePhotoVisibility={profilePhotoVisibility}
              setProfilePhotoVisibility={setProfilePhotoVisibility}
              aboutVisibility={aboutVisibility}
              setAboutVisibility={setAboutVisibility}
              callPrivacy={callPrivacy}
              setCallPrivacy={setCallPrivacy}
              searchDiscoverable={searchDiscoverable}
              setSearchDiscoverable={setSearchDiscoverable}
              groupAddPermission={groupAddPermission}
              setGroupAddPermission={setGroupAddPermission}
              readReceiptsEnabled={readReceiptsEnabled}
              setReadReceiptsEnabled={setReadReceiptsEnabled}
              typingIndicatorsEnabled={typingIndicatorsEnabled}
              setTypingIndicatorsEnabled={setTypingIndicatorsEnabled}
              loginAlertsEnabled={loginAlertsEnabled}
              setLoginAlertsEnabled={setLoginAlertsEnabled}
              savingPrivacy={savingPrivacy}
              persistPrivacy={persistPrivacy}
            />

            <motion.section
              {...sectionMotion}
              transition={{ duration: 0.2, delay: 0.1 }}
              id="devices-sessions"
              className="vs-settings-card space-y-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <SettingsSectionHeading
                  icon={MonitorSmartphone}
                  title={t("settingsSessionsTitle")}
                  hint={t("settingsSessionsHint")}
                />
                <button
                  type="button"
                  onClick={revokeOthers}
                  disabled={sessionActionId === "others" || !hasOtherSessions}
                  className="vs-btn-outline-sm shrink-0 text-muted disabled:opacity-50"
                >
                  {sessionActionId === "others"
                    ? "…"
                    : t("settingsSessionsSignOutOthers")}
                </button>
              </div>

              {sessionsBusy ? (
                <p className="text-sm text-muted">{t("loading")}</p>
              ) : sessions.length === 0 ? (
                <p className="text-sm text-muted">{t("settingsSessionsEmpty")}</p>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <div key={session.sessionId} className="vs-stat-tile p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 gap-3">
                          <div className="vs-icon-tile h-10 w-10">
                            <SessionDeviceIcon deviceType={session.deviceType} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-semibold text-ink">
                                {session.deviceLabel ||
                                  session.label ||
                                  t("settingsSessionsUnknown")}
                              </p>
                              {session.current ? (
                                <span className="vs-chip-current">
                                  {t("settingsSessionsCurrent")}
                                </span>
                              ) : null}
                            </div>
                            {(session.browser || session.os) && (
                              <p className="mt-0.5 text-xs text-muted">
                                {[session.browser, session.os].filter(Boolean).join(" · ")}
                              </p>
                            )}
                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                              <span>
                                {t("settingsSessionsLastSeenLabel", {
                                  date: formatSessionTime(
                                    session.lastSeenAt,
                                    i18n.language,
                                  ),
                                })}
                              </span>
                              <span>
                                {t("settingsSessionsSignedInLabel", {
                                  date: formatSessionTime(
                                    session.createdAt,
                                    i18n.language,
                                  ),
                                })}
                              </span>
                              {session.ip ? (
                                <span>
                                  {t("settingsSessionsIpLabel", { ip: session.ip })}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            session.current
                              ? signOutCurrentDevice()
                              : revokeOneSession(session.sessionId)
                          }
                          disabled={
                            session.current
                              ? sessionActionId === "current"
                              : sessionActionId === session.sessionId
                          }
                          className={cn(
                            "w-full rounded-xl border px-3 py-2 text-xs font-semibold shadow-sm outline-none transition focus-visible:ring-2 disabled:opacity-50 sm:w-auto",
                            session.current
                              ? "border-brand-300 bg-brand-50 text-brand-900 hover:bg-brand-100 focus-visible:ring-brand-400 dark:border-brand-700/50 dark:bg-brand-900/30 dark:text-[rgb(var(--vega-ink))] dark:hover:bg-brand-900/50"
                              : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100 focus-visible:ring-red-400 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300",
                          )}
                        >
                          {(
                            session.current
                              ? sessionActionId === "current"
                              : sessionActionId === session.sessionId
                          )
                            ? "…"
                            : session.current
                              ? t("settingsSessionsSignOutCurrent")
                              : t("settingsSessionsSignOut")}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.section>

            <motion.section
              {...sectionMotion}
              transition={{ duration: 0.2, delay: 0.12 }}
              className={cn(
                "vs-settings-card space-y-3 border-red-200/40 dark:border-red-900/30",
              )}
            >
              <SettingsSectionHeading
                icon={Trash2}
                title={t("privacyDeleteAccountAction")}
                hint={t("privacyDeleteAccountHint")}
              />
              <button
                type="button"
                onClick={() => setDeleteAccountOpen(true)}
                disabled={deleting}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-red-600/25 transition hover:bg-red-700 disabled:opacity-60 dark:bg-red-800 dark:hover:bg-red-900"
              >
                {deleting
                  ? t("privacyDeleteAccountBusy")
                  : t("privacyDeleteAccountAction")}
              </button>
            </motion.section>
        <DeleteAccountDialog
          open={deleteAccountOpen}
          onOpenChange={setDeleteAccountOpen}
          onConfirm={deleteAccount}
          busy={deleting}
        />
      </AccountPageShell>
    </ProtectedPageGate>
  );
}
