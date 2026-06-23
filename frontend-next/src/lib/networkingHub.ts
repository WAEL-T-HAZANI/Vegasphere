export function splitNetworkingTags(value: string): string[] {
  return Array.from(
    new Set(
      String(value || "")
        .split(/[,\n#]+/)
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 16),
    ),
  );
}

export function joinNetworkingTags(items: string[] | undefined): string {
  return (Array.isArray(items) ? items : []).join(", ");
}

export function networkingUserLabel(user: {
  name?: string;
  username?: string;
} | null | undefined): string {
  return String(user?.name || user?.username || "").trim();
}

export function networkingUserId(user?: { _id?: unknown } | null): string {
  if (!user?._id) return "";
  if (typeof user._id === "string") return user._id;
  return String(user._id);
}

/** Networking tab fields only — never uses bio/about. */
export function networkingDataLine(
  user: NetworkingIntroUser | null | undefined,
  fallback: string,
  locale?: string,
): string {
  const headline = String(user?.networkingHeadline || "").trim();
  if (headline) return headline;
  const lookingFor = String(user?.networkingLookingFor || "").trim();
  if (lookingFor) return lookingFor;
  const sep = String(locale || "").startsWith("ar") ? "، " : ", ";
  const skills = (user?.networkingSkills || []).filter(Boolean).slice(0, 4);
  if (skills.length) return skills.join(sep);
  const interests = (user?.networkingInterests || []).filter(Boolean).slice(0, 4);
  if (interests.length) return interests.join(sep);
  return fallback;
}

/** @deprecated Use networkingDataLine — kept as alias for match cards. */
export function networkingProfileLine(
  user: NetworkingIntroUser | null | undefined,
  fallback: string,
  locale?: string,
): string {
  return networkingDataLine(user, fallback, locale);
}

export type NetworkingReason =
  | { code: "shared_skills"; items?: string[] }
  | { code: "shared_interests"; items?: string[] }
  | { code: "mutual_groups"; count?: number }
  | { code: "open_to_collaborate" }
  | { code: "similar_keywords"; items?: string[] }
  | { code: "active_member" }
  | { code: string; items?: string[]; count?: number };

export function formatNetworkingReason(
  reason: NetworkingReason | string,
  t: (_key: string, _opts?: Record<string, unknown>) => string,
): string {
  if (typeof reason === "string") {
    return reason;
  }
  switch (reason.code) {
    case "shared_skills":
      return t("networkingReasonSharedSkills", {
        items: (reason.items || []).join(", "),
      });
    case "shared_interests":
      return t("networkingReasonSharedInterests", {
        items: (reason.items || []).join(", "),
      });
    case "mutual_groups":
      return t("networkingReasonMutualGroups", {
        count: reason.count ?? 0,
      });
    case "open_to_collaborate":
      return t("networkingOpenToCollaborate");
    case "similar_keywords":
      return t("networkingReasonKeywords", {
        items: (reason.items || []).join(", "),
      });
    case "active_member":
      return t("networkingMemberFallback");
    default:
      return t("networkingMemberFallback");
  }
}

export type NetworkingIntroUser = {
  _id?: unknown;
  name?: string;
  username?: string;
  email?: string;
  about?: string;
  networkingHeadline?: string;
  networkingLookingFor?: string;
  networkingSkills?: string[];
  networkingInterests?: string[];
};

export type BuildNetworkingIntroInput = {
  viewerLookingFor?: string;
  target: NetworkingIntroUser;
  sharedSkills?: string[];
  sharedInterests?: string[];
  topReason?: NetworkingReason;
  locale?: string;
};

function pickVariant(seed: string, count: number): number {
  if (count <= 1) return 0;
  let hash = 0;
  for (const ch of String(seed || "")) {
    hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  }
  return Math.abs(hash) % count;
}

/** Build a personalized intro from this match card's networking data. */
export function buildNetworkingIntro(
  input: BuildNetworkingIntroInput,
  t: (_key: string, _opts?: Record<string, unknown>) => string,
): string {
  const target = input.target || {};
  const seed = networkingUserId(target) || networkingUserLabel(target) || "target";
  const name = networkingUserLabel(target) || t("networkingMemberFallback");
  const locale = input.locale || "en";
  const listSep = String(locale).startsWith("ar") ? "، " : ", ";
  const shared = Array.from(
    new Set([...(input.sharedSkills || []), ...(input.sharedInterests || [])].filter(Boolean)),
  ).slice(0, 4);
  const viewerGoal = String(input.viewerLookingFor || "").trim();
  const targetSkills = (target.networkingSkills || []).filter(Boolean);
  const targetInterests = (target.networkingInterests || []).filter(Boolean);
  const headline = String(target.networkingHeadline || "").trim();
  const lookingFor = String(target.networkingLookingFor || "").trim();
  const reasonLine = input.topReason ? formatNetworkingReason(input.topReason, t) : "";

  const greeting = t("networkingIntroGreeting", { name });

  let open = "";
  if (shared.length) {
    open = t("networkingIntroOpenShared", { items: shared.join(listSep) });
  } else if (headline) {
    open = t("networkingIntroOpenHeadline", { text: headline });
  } else if (targetSkills.length) {
    open = t("networkingIntroOpenSkills", { items: targetSkills.slice(0, 3).join(listSep) });
  } else if (targetInterests.length) {
    open = t("networkingIntroOpenInterests", { items: targetInterests.slice(0, 3).join(listSep) });
  } else if (lookingFor) {
    open = t("networkingIntroOpenLookingFor", { text: lookingFor });
  } else {
    open = t("networkingIntroOpenGeneric");
  }

  let bridge = "";
  if (viewerGoal && targetSkills.length) {
    const keys = [
      "networkingIntroBridgeProjectSkill1",
      "networkingIntroBridgeProjectSkill2",
      "networkingIntroBridgeProjectSkill3",
    ];
    bridge = t(keys[pickVariant(`${seed}:bridge`, keys.length)], {
      project: viewerGoal,
      skill: targetSkills[pickVariant(seed, targetSkills.length)],
    });
  } else if (viewerGoal && headline) {
    const keys = ["networkingIntroBridgeProjectHeadline1", "networkingIntroBridgeProjectHeadline2"];
    bridge = t(keys[pickVariant(`${seed}:bridge`, keys.length)], { project: viewerGoal });
  } else if (viewerGoal) {
    const keys = [
      "networkingIntroBridgeProject1",
      "networkingIntroBridgeProject2",
      "networkingIntroBridgeProject3",
    ];
    bridge = t(keys[pickVariant(`${seed}:bridge`, keys.length)], { project: viewerGoal });
  } else if (targetSkills.length) {
    bridge = t("networkingIntroBridgeSkillOnly", {
      skill: targetSkills[pickVariant(seed, targetSkills.length)],
    });
  } else if (lookingFor) {
    bridge = t("networkingIntroBridgeGoals");
  }

  const closeKeys = [
    "networkingIntroClose1",
    "networkingIntroClose2",
    "networkingIntroClose3",
  ];
  const close = t(closeKeys[pickVariant(`${seed}:close`, closeKeys.length)]);

  const parts = [greeting, open];
  if (reasonLine && !open.includes(reasonLine)) {
    parts.push(reasonLine);
  }
  if (bridge) parts.push(bridge);
  parts.push(close);
  return parts.filter(Boolean).join(" ");
}
