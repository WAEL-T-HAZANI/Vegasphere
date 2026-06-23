import i18n from "i18next";
import type { TFunction } from "i18next";
import type { ApiErrorBody } from "@/types";

type ApiErrorLike = {
  response?: { data?: ApiErrorBody };
  message?: string;
};

/** Exact backend `message` strings (lowercase) → i18n key */
const API_MESSAGE_KEYS: Record<string, string> = {
  "invalid credentials": "apiInvalidCredentials",
  "please fill all the fields": "apiPleaseFillAllFields",
  "please fill email and password": "apiPleaseFillEmailPassword",
  "invalid email": "emailInvalid",
  "user already exists": "apiUserAlreadyExists",
  "username already taken": "apiUsernameTaken",
  "email already in use": "apiEmailAlreadyInUse",
  "email is required": "emailRequired",
  "current password required to change email": "changeEmailPasswordRequired",
  "please authenticate using a valid token": "apiUnauthorized",
  unauthorized: "apiUnauthorized",
  "user not found": "apiUserNotFound",
  "not found": "apiNotFound",
  "chat invite required": "chatInviteRequired",
  blocked: "apiBlocked",
  "user is blocked": "apiUserBlocked",
  "admin only": "apiAdminOnly",
  "session not found": "apiSessionNotFound",
  "use sign out for the current session": "settingsSessionsUseSignOut",
  "pin must be 4-8 digits": "apiPinMustBeDigits",
  "pin required": "twoStepPinRequired",
  "invalid pin": "apiInvalidPin",
  "invalid 2-step pin": "twoStepPinInvalid",
  "2-step pin required": "twoStepPinRequired",
  "set a 2-step pin before enabling it": "twoStepPinSetFirst",
  "set a 2-step pin": "twoStepPinSetFirst",
  "invalid or expired verification link.": "apiInvalidVerificationLink",
  "invalid or expired verification link": "apiInvalidVerificationLink",
  "token required": "apiTokenRequired",
  "valid token and password (min 6 characters) are required":
    "apiResetTokenInvalid",
  "invalid or expired invite": "joinInvalidOrExpired",
  "invalid invite": "apiInvalidInvite",
  "invalid link": "apiInvalidInviteLink",
  "could not send message": "apiCouldNotSendMessage",
  "no conversation found": "apiConversationNotFound",
  "conversation not found": "apiConversationNotFound",
  "channel not found": "apiChannelNotFound",
  "not a member": "apiNotAMember",
  "not a group or channel": "apiGroupsChannelsOnly",
  "only for groups and channels": "apiGroupsChannelsOnly",
  "assign another channel admin before leaving": "apiChannelAdminLeaveBlocked",
  "name is required": "apiNameRequired",
  "name required": "apiNameRequired",
  "file required": "apiFileRequired",
  "message not found": "apiMessageNotFound",
  "cannot block yourself": "apiCannotBlockSelf",
  "cannot invite yourself": "apiCannotInviteSelf",
  "channel slug already exists": "apiChannelSlugTaken",
  "you are banned from this channel": "apiBannedFromChannel",
  "private channels are invite only": "apiPrivateChannelInviteOnly",
  "you are banned from this chat": "apiBannedFromChat",
  "invalid user": "apiInvalidUser",
  "invalid phone number. use international format like +15551234567":
    "apiInvalidPhone",
  "invalid lastseenvisibility": "apiInvalidPrivacySetting",
  "invalid profilephotovisibility": "apiInvalidPrivacySetting",
  "invalid groupaddpermission": "apiInvalidPrivacySetting",
  "geoip unavailable": "apiGeoIpUnavailable",
  "web push not configured": "apiWebPushNotConfigured",
  "maintenance endpoint disabled": "apiMaintenanceDisabled",
  "call invite not found": "apiCallInviteNotFound",
  "networking post not found": "apiNetworkingPostNotFound",
  "poll not found": "apiPollNotFound",
  "poll is closed": "apiPollClosed",
  "cannot edit this message": "apiCannotEditMessage",
  "e2e is only for direct chats": "apiE2eDirectOnly",
  "thread not found": "apiThreadNotFound",
  "duplicate or missing member wrap": "apiDuplicateMemberWrap",
  "conversation must include another member": "apiConversationNeedsMember",
  "private channel access denied": "apiPrivateChannelAccessDenied",
  "text or image required": "apiStatusContentRequired",
  "text is required.": "apiTextRequired",
  "invite not found": "apiInviteNotFound",
  "invite is revoked": "apiInviteRevoked",
  "member not found": "apiMemberNotFound",
  "member not in chat": "apiMemberNotInChat",
  "member not in group": "apiMemberNotInGroup",
  "some users only allow group adds by contacts": "apiGroupAddContactsOnly",
  "some users do not allow group adds": "apiGroupAddNobody",
  "ban not found": "apiBanNotFound",
  "cannot ban yourself": "apiCannotBanSelf",
  "not a member of this chat": "apiNotAMember",
  "invalid conversation": "apiInvalidConversation",
  "invalid subscription": "apiInvalidSubscription",
  "invalid public key": "apiInvalidPublicKey",
  "invalid thread id": "apiInvalidThreadId",
  "unknown action": "apiUnknownAction",
  "email verified.": "verifyEmailSuccessToast",
  "email already verified.": "apiEmailAlreadyVerified",
  "password updated. you can sign in.": "resetPasswordSuccessToast",
  "if an account exists for this email, password reset instructions were sent (check your inbox and spam).":
    "forgotPasswordSuccessToast",
  "profile updated": "apiProfileUpdated",
  "email updated. verify your new address.": "apiEmailUpdatedVerify",
  "invalid or expired reset link. request a new one.": "apiInvalidResetLink",
};

function normalizeApiMessage(message: string): string {
  return message.trim().toLowerCase();
}

/** Map common Zod/backend validation strings to i18n (auth forms). */
function translateFuzzyApiMessage(message: string, t: TFunction): string | null {
  const m = normalizeApiMessage(message);
  if (m.includes("invalid email")) return t("emailInvalid");
  if (m.includes("display name cannot contain numbers")) return t("nameNoDigitsError");
  if (
    (m.includes("too small") || m.includes("at least")) &&
    (m.includes("name") || m.includes(">=3") || m.includes("3 character"))
  ) {
    return t("nameMinLengthError");
  }
  if (
    (m.includes("too small") || m.includes("at least")) &&
    (m.includes("password") || m.includes(">=6") || m.includes("6 character"))
  ) {
    return t("passwordMinLengthError");
  }
  if (m.includes("pin required") || m.includes("2-step pin required")) {
    return t("twoStepPinRequired");
  }
  if (m.includes("set a 2-step pin")) return t("twoStepPinSetFirst");
  if (m.includes("use sign out for the current session")) {
    return t("settingsSessionsUseSignOut");
  }
  if (m.includes("invalid credentials")) return t("apiInvalidCredentials");
  if (
    m.includes("push service not available") ||
    m.includes("registration failed - push service not available")
  ) {
    return t("pushServiceUnavailable");
  }
  return null;
}

function translateKnownApiMessage(message: string, t: TFunction): string | null {
  const key = API_MESSAGE_KEYS[normalizeApiMessage(message)];
  if (key) return t(key);
  return translateFuzzyApiMessage(message, t);
}

function isArabicUi(): boolean {
  const lang = i18n.resolvedLanguage || i18n.language || "";
  return lang.startsWith("ar");
}

function isTransportError(err: ApiErrorLike | null | undefined): boolean {
  const code = String((err as { code?: string } | undefined)?.code || "");
  const message = String(err?.message || "").trim().toLowerCase();
  if (code === "ERR_NETWORK" || code === "ECONNABORTED" || code === "ECONNREFUSED") {
    return true;
  }
  return (
    message === "network error" ||
    message.includes("network error") ||
    message.includes("failed to fetch")
  );
}

/** User-facing message from an API/axios error. */
export function formatApiError(
  err: ApiErrorLike | null | undefined,
  t: TFunction,
  fallbackKey = "errorOccurred",
): string {
  if (isTransportError(err)) {
    return t("apiNetworkUnreachable");
  }

  const body = err?.response?.data as
    | { error?: string; message?: string; details?: { requiresPin?: boolean } }
    | undefined;
  const fromApi = body?.message || body?.error;
  if (typeof fromApi === "string" && fromApi.trim()) {
    const trimmed = fromApi.trim();
    const translated = translateKnownApiMessage(trimmed, t);
    if (translated) return translated;
    if (isArabicUi()) return t(fallbackKey);
    return trimmed;
  }
  if (err?.message && String(err.message).trim()) {
    const trimmed = String(err.message).trim();
    const translated = translateKnownApiMessage(trimmed, t);
    if (translated) return translated;
    if (isArabicUi()) return t(fallbackKey);
    return trimmed;
  }
  return t(fallbackKey);
}

/** Translate a raw API success/info `message` string for display in the UI. */
export function formatApiMessage(
  message: string | null | undefined,
  t: TFunction,
  fallbackKey = "errorOccurred",
): string {
  const trimmed = String(message || "").trim();
  if (!trimmed) return t(fallbackKey);
  const translated = translateKnownApiMessage(trimmed, t);
  if (translated) return translated;
  if (isArabicUi()) return t(fallbackKey);
  return trimmed;
}

/** True when login failed because 2-step PIN is required. */
export function apiErrorRequiresPin(
  err: ApiErrorLike | null | undefined,
): boolean {
  const details = (err?.response?.data as { details?: { requiresPin?: boolean } })
    ?.details;
  return Boolean(details?.requiresPin);
}

function getApiMessageRaw(err: ApiErrorLike | null | undefined): string {
  const body = err?.response?.data as { error?: string; message?: string } | undefined;
  return String(body?.message || body?.error || "").trim();
}

export type AuthFieldErrorMap = {
  name?: string;
  email?: string;
  password?: string;
  pin?: string;
  token?: string;
  toast?: string;
};

/** Map login API errors to inline fields where possible. */
export function mapLoginApiError(
  err: ApiErrorLike | null | undefined,
  t: TFunction,
  options: { pinRequired?: boolean; pinValue?: string } = {},
): AuthFieldErrorMap {
  const raw = normalizeApiMessage(getApiMessageRaw(err));
  const pinRequired = Boolean(options.pinRequired);

  if (pinRequired && !String(options.pinValue || "").trim()) {
    return { pin: t("twoStepPinRequired") };
  }

  if (
    raw.includes("invalid pin") ||
    raw.includes("invalid 2-step pin") ||
    raw.includes("pin must be")
  ) {
    return { pin: t("twoStepPinInvalid") };
  }

  if (raw.includes("pin required") || raw.includes("2-step pin required")) {
    return { pin: t("twoStepPinRequired") };
  }

  if (raw.includes("invalid credentials")) {
    return { password: t("apiInvalidCredentials") };
  }

  if (raw.includes("invalid email")) {
    return { email: t("emailInvalidError") };
  }

  return {
    toast: formatApiError(
      err,
      t,
      pinRequired ? "twoStepPinInvalid" : "errorOccurred",
    ),
  };
}

/** Map signup API errors to inline fields where possible. */
export function mapSignupApiError(
  err: ApiErrorLike | null | undefined,
  t: TFunction,
): AuthFieldErrorMap {
  const raw = normalizeApiMessage(getApiMessageRaw(err));

  if (
    raw.includes("user already exists") ||
    raw.includes("email already in use")
  ) {
    return { email: t("apiEmailAlreadyInUse") };
  }

  if (raw.includes("invalid email")) {
    return { email: t("emailInvalidError") };
  }

  if (raw.includes("display name cannot contain numbers")) {
    return { name: t("nameNoDigitsError") };
  }

  if (
    (raw.includes("too small") || raw.includes("at least")) &&
    (raw.includes("name") || raw.includes(">=3") || raw.includes("3 character"))
  ) {
    return { name: t("nameMinLengthError") };
  }

  if (
    (raw.includes("too small") || raw.includes("at least")) &&
    (raw.includes("password") || raw.includes(">=6") || raw.includes("6 character"))
  ) {
    return { password: t("passwordMinLengthError") };
  }

  return { toast: formatApiError(err, t) };
}

/** Map reset-password API errors to inline fields where possible. */
export function mapResetApiError(
  err: ApiErrorLike | null | undefined,
  t: TFunction,
): AuthFieldErrorMap {
  const raw = normalizeApiMessage(getApiMessageRaw(err));

  if (
    raw.includes("token required") ||
    raw.includes("invalid or expired reset") ||
    raw.includes("valid token and password")
  ) {
    return { token: t("apiInvalidResetLink") };
  }

  if (
    (raw.includes("too small") || raw.includes("at least")) &&
    (raw.includes("password") || raw.includes(">=6") || raw.includes("6 character"))
  ) {
    return { password: t("passwordMinLengthError") };
  }

  return { toast: formatApiError(err, t) };
}
