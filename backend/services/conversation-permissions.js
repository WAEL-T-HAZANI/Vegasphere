/**
 * Effective rights for group/channel members (Telegram-style).
 * Admins always have full rights. DMs are unrestricted for posting.
 */

function uidStr(userId) {
  return String(userId || "");
}

function isConversationAdmin(conversation, userId) {
  const u = uidStr(userId);
  return Boolean(
    conversation?.admins?.some(
      (a) => String(a?._id || a || "") === u
    )
  );
}

function isConversationMember(conversation, userId) {
  const u = uidStr(userId);
  return Boolean(
    conversation?.members?.some(
      (m) => String(m?._id || m || "") === u
    )
  );
}

/** True if user has an active (non-expired) ban record. */
function isUserBannedFromConversation(conversation, userId) {
  const u = uidStr(userId);
  const list = conversation?.bannedUsers || [];
  const now = Date.now();
  for (const row of list) {
    const id = String(row.userId?._id || row.userId || "");
    if (id !== u) continue;
    const exp = row.expiresAt ? new Date(row.expiresAt).getTime() : null;
    if (exp != null && !Number.isNaN(exp) && exp <= now) continue;
    return true;
  }
  return false;
}

function getChannelPostingMode(conversation) {
  if (!conversation?.isChannel) return null;
  if (String(conversation.channelPostingMode || "") === "admins_only") {
    return "admins_only";
  }
  return "all";
}

function defaultRightsForGroupOrChannel(conversation) {
  const d = conversation?.defaultMemberRights || {};
  return {
    canPostMessages: d.canPostMessages !== false,
    canAddMembers: d.canAddMembers !== false,
    canPinMessages: Boolean(d.canPinMessages),
    canEditInfo: Boolean(d.canEditInfo),
  };
}

function mergeOverride(base, conversation, userId) {
  const u = uidStr(userId);
  const list = conversation?.memberPermissionOverrides || [];
  const ov = list.find(
    (row) => String(row.userId?._id || row.userId || "") === u
  );
  if (!ov) return { ...base };
  const out = { ...base };
  if (ov.canPostMessages !== undefined) {
    out.canPostMessages = Boolean(ov.canPostMessages);
  }
  if (ov.canAddMembers !== undefined) {
    out.canAddMembers = Boolean(ov.canAddMembers);
  }
  if (ov.canPinMessages !== undefined) {
    out.canPinMessages = Boolean(ov.canPinMessages);
  }
  if (ov.canEditInfo !== undefined) {
    out.canEditInfo = Boolean(ov.canEditInfo);
  }
  return out;
}

/**
 * @returns {{ canPostMessages: boolean, canAddMembers: boolean, canPinMessages: boolean, canEditInfo: boolean }}
 */
function getEffectiveMemberRights(conversation, userId) {
  const u = uidStr(userId);
  if (!conversation) {
    return {
      canPostMessages: false,
      canAddMembers: false,
      canPinMessages: false,
      canEditInfo: false,
    };
  }
  if (isConversationAdmin(conversation, u)) {
    return {
      canPostMessages: true,
      canAddMembers: true,
      canPinMessages: true,
      canEditInfo: true,
    };
  }
  if (!conversation.isGroup && !conversation.isChannel) {
    return {
      canPostMessages: true,
      canAddMembers: false,
      canPinMessages: true,
      canEditInfo: true,
    };
  }

  if (conversation.isChannel && getChannelPostingMode(conversation) === "admins_only") {
    const base = {
      canPostMessages: false,
      canAddMembers: false,
      canPinMessages: false,
      canEditInfo: false,
    };
    return mergeOverride(base, conversation, u);
  }

  const def = defaultRightsForGroupOrChannel(conversation);
  return mergeOverride(def, conversation, u);
}

function assertCanPost(conversation, userId) {
  if (isUserBannedFromConversation(conversation, userId)) {
    return { ok: false, code: 403, error: "You are banned from this chat" };
  }
  if (!isConversationMember(conversation, userId)) {
    return { ok: false, code: 403, error: "Forbidden" };
  }
  const r = getEffectiveMemberRights(conversation, userId);
  if (!r.canPostMessages) {
    return { ok: false, code: 403, error: "You cannot post in this chat" };
  }
  return { ok: true };
}

function assertCanAddMembers(conversation, userId) {
  if (!isConversationMember(conversation, userId)) {
    return { ok: false, code: 403, error: "Forbidden" };
  }
  const r = getEffectiveMemberRights(conversation, userId);
  if (!r.canAddMembers) {
    return { ok: false, code: 403, error: "You cannot add members" };
  }
  return { ok: true };
}

function assertCanPin(conversation, userId) {
  if (!isConversationMember(conversation, userId)) {
    return { ok: false, code: 403, error: "Forbidden" };
  }
  const r = getEffectiveMemberRights(conversation, userId);
  if (!r.canPinMessages) {
    return { ok: false, code: 403, error: "You cannot pin messages" };
  }
  return { ok: true };
}

function assertCanEditInfo(conversation, userId) {
  if (!isConversationMember(conversation, userId)) {
    return { ok: false, code: 403, error: "Forbidden" };
  }
  const r = getEffectiveMemberRights(conversation, userId);
  if (!r.canEditInfo) {
    return { ok: false, code: 403, error: "You cannot edit chat info" };
  }
  return { ok: true };
}

module.exports = {
  isConversationAdmin,
  isConversationMember,
  isUserBannedFromConversation,
  getChannelPostingMode,
  getEffectiveMemberRights,
  assertCanPost,
  assertCanAddMembers,
  assertCanPin,
  assertCanEditInfo,
};
