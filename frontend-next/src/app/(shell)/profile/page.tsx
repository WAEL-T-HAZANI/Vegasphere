"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { UserRound, Phone, Pencil, X } from "lucide-react";
import PhoneInput from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import "react-phone-number-input/style.css";
import PhoneCountrySelect from "@/components/profile/PhoneCountrySelect";
import ProfileShareSection from "@/components/profile/ProfileShareSection";
import { getDefaultPhoneCountry } from "@/lib/defaultPhoneCountry";
import { PROFILE_ABOUT_MAX_LENGTH } from "@/lib/profileLimits";

import { authClient, userClient } from "@/lib/clients";
import { formatApiError } from "@/lib/apiError";
import { showAppToast } from "@/lib/appToast";
import { isCustomAvatar, resolveAvatarUrl } from "@/lib/avatarUrl";
import { setUser } from "@/store/slices/authSlice";
import AccountPageShell from "@/components/account/AccountPageShell";
import ProtectedPageGate from "@/components/layout/ProtectedPageGate";
import SettingsSectionHeading from "@/components/settings/SettingsSectionHeading";
import { cn } from "@/lib/classNames";

const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

export default function ProfilePage() {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const status = useAppSelector((s) => s.auth.status);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [about, setAbout] = useState("");
  const [profilePic, setProfilePic] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarImgFailed, setAvatarImgFailed] = useState(false);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [pendingAvatarRemove, setPendingAvatarRemove] = useState(false);
  const savedAvatarRaw = user?.profilePic || "";
  const currentAvatarRaw = pendingAvatarRemove
    ? ""
    : pendingAvatarFile
      ? savedAvatarRaw
      : profilePic || savedAvatarRaw;
  const showRemoveControl =
    pendingAvatarFile ||
    pendingAvatarRemove ||
    isCustomAvatar(savedAvatarRaw);

  const initials = String(name || user?.name || "V")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => String(s || "")[0] || "")
    .join("")
    .toUpperCase();

  const dirty = useMemo(
    () =>
      Boolean(
        (user?.name || "") !== name ||
          (user?.username || "") !== username ||
          (user?.about || "") !== about ||
          (user?.phone || "") !== phone ||
          Boolean(pendingAvatarFile) ||
          pendingAvatarRemove,
      ),
    [
      user?.name,
      user?.username,
      user?.about,
      user?.phone,
      name,
      username,
      about,
      phone,
      pendingAvatarFile,
      pendingAvatarRemove,
    ],
  );

  const userId = user?._id ? String(user._id) : "";

  const refreshUser = useCallback(async () => {
    const { data } = await authClient.getMe();
    dispatch(setUser(data));
    setProfilePic(data?.profilePic || "");
    return data;
  }, [dispatch]);

  const toastError = useCallback(
    (err: unknown) => {
      showAppToast({
        id: "profile-err",
        body: formatApiError(err, t, "errorOccurred"),
      });
    },
    [t],
  );

  const clearAvatarPreview = useCallback(() => {
    if (avatarPreviewUrl) {
      try {
        URL.revokeObjectURL(avatarPreviewUrl);
      } catch {}
    }
    setAvatarPreviewUrl("");
  }, [avatarPreviewUrl]);

  const resetAvatarStaging = useCallback(() => {
    clearAvatarPreview();
    setPendingAvatarFile(null);
    setPendingAvatarRemove(false);
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  }, [clearAvatarPreview]);

  useEffect(() => {
    if (!userId || !user) return;
    resetAvatarStaging();
    setName(user.name || "");
    setUsername(user.username || "");
    setAbout(user.about || "");
    setProfilePic(user.profilePic || "");
    setPhone(user.phone || "");
    setAvatarImgFailed(false);
  }, [userId, resetAvatarStaging]);

  useEffect(() => {
    if (!user || dirty) return;
    setName(user.name || "");
    setUsername(user.username || "");
    setAbout(user.about || "");
    setProfilePic(user.profilePic || "");
    setPhone(user.phone || "");
    setAvatarImgFailed(false);
  }, [
    user,
    user?.name,
    user?.username,
    user?.about,
    user?.phone,
    user?.profilePic,
    dirty,
  ]);

  const stageAvatarFile = async (file: File | undefined) => {
    if (!file || avatarUploading) return;
    const mime = String(file.type || "").toLowerCase();
    if (!mime.startsWith("image/")) {
      showAppToast({
        id: "profile-avatar-type",
        body: t("profileAvatarInvalidType"),
      });
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      showAppToast({
        id: "profile-avatar-size",
        body: t("profileAvatarTooLarge"),
      });
      return;
    }
    clearAvatarPreview();
    setPendingAvatarFile(file);
    setPendingAvatarRemove(false);
    setAvatarPreviewUrl(URL.createObjectURL(file));
    setAvatarImgFailed(false);
    setAvatarUploading(true);
    try {
      const form = new FormData();
      form.append("avatar", file, file.name || "avatar.png");
      const { data } = await userClient.uploadAvatar(form);
      setProfilePic(data?.url || "");
      setPendingAvatarFile(null);
      clearAvatarPreview();
      await refreshUser();
      showAppToast({ id: "profile-avatar-live", body: t("profileSaved") });
    } catch (err) {
      toastError(err);
      resetAvatarStaging();
    } finally {
      setAvatarUploading(false);
    }
  };

  const stageAvatarRemoval = () => {
    if (pendingAvatarFile) {
      resetAvatarStaging();
      return;
    }
    if (!isCustomAvatar(savedAvatarRaw)) return;
    clearAvatarPreview();
    setPendingAvatarFile(null);
    setPendingAvatarRemove(true);
    setAvatarImgFailed(false);
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (/\d/.test(String(name).trim())) {
      showAppToast({ id: "profile-name-digits", body: t("nameNoDigitsError") });
      return;
    }
    setSaving(true);
    try {
      if (pendingAvatarRemove) {
        const { data } = await userClient.removeAvatar();
        setProfilePic(data?.url || "");
      } else if (pendingAvatarFile) {
        const form = new FormData();
        form.append("avatar", pendingAvatarFile, pendingAvatarFile.name || "avatar.png");
        const { data } = await userClient.uploadAvatar(form);
        setProfilePic(data?.url || "");
      }

      const body: {
        name: string;
        about: string;
        phone: string;
        username?: string;
      } = {
        name: name.trim(),
        about: about.trim(),
        phone: phone || "",
      };
      const nextUsername = username.trim().toLowerCase().replace(/\s+/g, "_");
      if (nextUsername) body.username = nextUsername;

      await userClient.updateProfile(body);
      resetAvatarStaging();
      await refreshUser();
      showAppToast({ id: "profile-saved", body: t("profileSaved") });
    } catch (err) {
      toastError(err);
    } finally {
      setSaving(false);
    }
  };

  const busy = saving;
  const phoneDefaultCountry = getDefaultPhoneCountry(i18n.language);
  const rtl = i18n.dir() === "rtl";

  return (
    <ProtectedPageGate titleKey="navProfile" status={status} user={user}>
      <AccountPageShell
        className="vs-profile-page"
        title={t("navProfile")}
        hint={t("profilePageHint")}
        headerAction={
          <button
            type="submit"
            form="vs-profile-form"
            disabled={busy || !dirty}
            className="vs-btn-primary-sm w-full px-5 py-2.5 sm:w-auto disabled:opacity-60"
          >
            {busy ? "…" : t("saveChanges")}
          </button>
        }
        mainClassName="pb-safe"
      >
          <form id="vs-profile-form" onSubmit={save} className="space-y-4">
            <section className="vs-settings-card space-y-4 !p-5 md:!p-6">
              <SettingsSectionHeading
                icon={UserRound}
                title={t("profileIdentity")}
                hint={t("profileIdentityHint")}
              />

              <div
                className={cn(
                  "vs-profile-identity-panel space-y-5",
                  dirty && "vs-profile-identity-panel--dirty",
                )}
              >
                <p className="text-xs font-medium text-muted">
                  {t("profileSaveHint")}
                </p>

                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="group relative shrink-0">
                  {pendingAvatarRemove ? (
                    <div className="grid h-24 w-24 place-items-center rounded-3xl bg-subtle text-2xl font-extrabold text-ink ring-1 ring-brand-200/40 dark:bg-brand-900/40 dark:text-brand-100 dark:ring-brand-800/50">
                      {initials || "V"}
                    </div>
                  ) : avatarPreviewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarPreviewUrl}
                      alt=""
                      className={cn(
                        "h-24 w-24 rounded-3xl border border-brand-200/50 object-cover shadow-md dark:border-white/10",
                        saving && "opacity-70",
                      )}
                    />
                  ) : !avatarImgFailed && currentAvatarRaw ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resolveAvatarUrl(currentAvatarRaw)}
                      alt=""
                      className="h-24 w-24 rounded-3xl border border-brand-200/50 object-cover shadow-md dark:border-white/10"
                      onError={() => setAvatarImgFailed(true)}
                    />
                  ) : (
                    <div className="grid h-24 w-24 place-items-center rounded-3xl bg-subtle text-2xl font-extrabold text-ink ring-1 ring-brand-200/40 dark:bg-brand-900/40 dark:text-brand-100 dark:ring-brand-800/50">
                      {initials || "V"}
                    </div>
                  )}
                  <div
                    role="button"
                    tabIndex={saving ? -1 : 0}
                    onClick={() => {
                      if (saving) return;
                      avatarInputRef.current?.click();
                    }}
                    onKeyDown={(e) => {
                      if (saving) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        avatarInputRef.current?.click();
                      }
                    }}
                    aria-label={t("profileAvatarUpload")}
                    aria-disabled={saving ? "true" : "false"}
                    className={cn(
                      "absolute inset-0 grid place-items-center rounded-3xl bg-black/0 text-white opacity-0 transition",
                      "group-hover:bg-black/38 group-hover:opacity-100",
                      "focus-visible:bg-black/38 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
                      saving && "cursor-not-allowed opacity-60",
                    )}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-black/45 shadow-sm">
                        <Pencil className="h-4 w-4" />
                      </span>
                      {showRemoveControl ? (
                        <button
                          type="button"
                          onClick={(ev) => {
                            ev.preventDefault();
                            ev.stopPropagation();
                            stageAvatarRemoval();
                          }}
                          disabled={saving}
                          aria-label={t("profileAvatarRemove")}
                          className="grid h-9 w-9 place-items-center rounded-full bg-black/45 shadow-sm outline-none transition hover:bg-black/55 focus-visible:ring-2 focus-visible:ring-red-400"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      ) : null}
                    </span>
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-xl font-bold text-ink">
                    {name.trim() || user?.name || t("navProfile")}
                  </div>
                </div>
              </div>

              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                disabled={saving || avatarUploading}
                onChange={(e) => {
                  void stageAvatarFile(e.target.files?.[0]);
                }}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="vs-label">{t("nameLabel")}</span>
                  <input
                    className="vs-input mt-2"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    minLength={3}
                  />
                </label>
                <label className="block">
                  <span className="vs-label">{t("profileUsername")}</span>
                  <input
                    className="vs-input mt-2"
                    value={username}
                    onChange={(e) =>
                      setUsername(
                        String(e.target.value || "")
                          .trim()
                          .toLowerCase()
                          .replace(/\s+/g, "_"),
                      )
                    }
                    placeholder="vegasphere"
                    autoCapitalize="none"
                    autoCorrect="off"
                  />
                </label>
              </div>

              <label className="block">
                <span className="vs-label">{t("aboutLabel")}</span>
                <textarea
                  className="vs-textarea mt-2"
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  rows={3}
                  maxLength={PROFILE_ABOUT_MAX_LENGTH}
                />
                <div className="mt-1 flex justify-end text-[11px] font-semibold text-muted">
                  {String(about || "").length}/{PROFILE_ABOUT_MAX_LENGTH}
                </div>
              </label>
              </div>
            </section>

            <ProfileShareSection
              userId={user?._id ? String(user._id) : ""}
              rtl={rtl}
            />

            <section className="vs-settings-card space-y-4 !p-5 md:!p-6">
              <SettingsSectionHeading
                icon={Phone}
                title={t("profilePhone")}
                hint={t("profilePhoneHint")}
              />
              <div className="min-w-0 rounded-2xl border border-brand-200/50 bg-surface/85 px-3 py-2 shadow-sm outline-none transition focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/25 dark:border-white/10 dark:bg-black/35 sm:px-3.5">
                <PhoneInput
                  international
                  defaultCountry={phoneDefaultCountry}
                  flags={flags}
                  countrySelectComponent={PhoneCountrySelect}
                  value={phone}
                  onChange={(v) => setPhone(v || "")}
                  placeholder="+15551234567"
                  className="vs-phone-input"
                />
              </div>
            </section>
          </form>
      </AccountPageShell>
    </ProtectedPageGate>
  );
}
