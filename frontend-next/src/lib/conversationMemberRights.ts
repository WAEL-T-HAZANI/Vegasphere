// @ts-nocheck
const EMPTY_RIGHTS = {
  canPostMessages: false,
  canAddMembers: false,
  canPinMessages: false,
  canEditInfo: false,
};

function applyOverride(base, conversation, userId) {
  const uid = String(userId);

  const overrides = conversation?.memberPermissionOverrides || [];

  const override = overrides.find(
    (row) => String(row?.userId?._id ?? row?.userId) === uid,
  );

  if (!override) return { ...base };

  const out = { ...base };

  if (override.canPostMessages != null) {
    out.canPostMessages = Boolean(override.canPostMessages);
  }

  if (override.canAddMembers != null) {
    out.canAddMembers = Boolean(override.canAddMembers);
  }

  if (override.canPinMessages != null) {
    out.canPinMessages = Boolean(override.canPinMessages);
  }

  if (override.canEditInfo != null) {
    out.canEditInfo = Boolean(override.canEditInfo);
  }

  return out;
}

export function getEffectiveMemberRightsForPeer(conversation, memberId) {
  const uid = String(memberId ?? "");

  if (!conversation || !uid) {
    return { ...EMPTY_RIGHTS };
  }

  const admins = conversation.admins || [];

  const isAdmin = admins.some((a) => String(a?._id ?? a) === uid);

  // Admins have full rights
  if (isAdmin) {
    return {
      canPostMessages: true,
      canAddMembers: true,
      canPinMessages: true,
      canEditInfo: true,
    };
  }

  // One-to-one chat fallback
  if (!conversation.isGroup && !conversation.isChannel) {
    return {
      canPostMessages: true,
      canAddMembers: false,
      canPinMessages: true,
      canEditInfo: true,
    };
  }

  // Channel with admin-only posting
  if (
    conversation.isChannel &&
    conversation.channelPostingMode === "admins_only"
  ) {
    const base = {
      canPostMessages: false,
      canAddMembers: false,
      canPinMessages: false,
      canEditInfo: false,
    };

    return applyOverride(base, conversation, uid);
  }

  // Default group/channel rights
  const d = conversation.defaultMemberRights || {};

  const base = {
    canPostMessages: d.canPostMessages !== false,
    canAddMembers: d.canAddMembers !== false,
    canPinMessages: Boolean(d.canPinMessages),
    canEditInfo: Boolean(d.canEditInfo),
  };

  return applyOverride(base, conversation, uid);
}
