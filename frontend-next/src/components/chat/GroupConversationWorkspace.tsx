"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import MemberPicker from "@/components/chat/MemberPicker";
import { api } from "@/lib/api";
import {
  patchConversationInList,
  setConversations,
} from "@/store/slices/chatSlice";
import { showAppToast } from "@/lib/appToast";
import { formatApiError } from "@/lib/apiError";
import { buildGroupMemberSuggestions, isConversationAdmin } from "@/lib/groupsHub";
import { cn } from "@/lib/classNames";
import { getEffectiveMemberRightsForPeer } from "@/lib/conversationMemberRights";
import SettingsToggleRow from "@/components/settings/SettingsToggleRow";
import type { Conversation, ConversationMember } from "@/types/api";

function formatCompactDateTime(value: unknown, language?: string) {
  if (!value) return "";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(language || undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function toDateTimeLocalValue(value: unknown) {
  if (!value) return "";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type GroupConversationWorkspaceProps = {
  conversationId: string;
  conversation: Conversation | null;
  onConversationChange: (_conv: Conversation | null) => void;
};

export default function GroupConversationWorkspace({
  conversationId,
  conversation: activeConv,
  onConversationChange,
}: GroupConversationWorkspaceProps) {
  const cid = String(conversationId || "");
  const { t, i18n } = useTranslation();
  const dir = i18n.dir();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const conversations = useAppSelector((s) => s.chat.conversations);

  const refreshConversationList = useCallback(async () => {
    const { data } = await api.get("/conversation/");
    dispatch(setConversations(data || []));
    const fresh = (data || []).find((c) => String(c?._id || "") === cid) || null;
    onConversationChange(fresh);
  }, [cid, dispatch, onConversationChange]);

  const notify = useCallback(
    (body: string, titleKey = "appNoticeTitle") => {
      showAppToast({
        id: "group-workspace-" + String(Date.now()),
        titleKey,
        body,
      });
    },
    [],
  );

  const isGroupAdmin = useMemo(
    () => isConversationAdmin(activeConv, user?._id),
    [activeConv, user?._id],
  );

  const activeBans = useMemo(() => {
    const raw =
      (activeConv?.bannedUsers as Array<{
        expiresAt?: string;
        userId?: { _id?: string; name?: string; email?: string } | string;
      }> | undefined) || [];
    const now = Date.now();
    return raw.filter((b) => {
      const exp = b.expiresAt ? new Date(String(b.expiresAt)).getTime() : null;
      if (exp != null && !Number.isNaN(exp) && exp <= now) return false;
      return true;
    });
  }, [activeConv?.bannedUsers]);

  const memberManagementSuggestions = useMemo(
    () => buildGroupMemberSuggestions(conversations, user?._id),
    [conversations, user?._id],
  );

  const [banUntilValue, setBanUntilValue] = useState("");
  const [banTargetMemberId, setBanTargetMemberId] = useState<string | null>(null);
  const [banDraftUntil, setBanDraftUntil] = useState("");
  const [inviteLinks, setInviteLinks] = useState<Array<Record<string, unknown>>>([]);
  const [moderationLog, setModerationLog] = useState<Array<Record<string, unknown>>>([]);
  const [topicName, setTopicName] = useState("");
  const [topicEditId, setTopicEditId] = useState("");
  const [topicEditName, setTopicEditName] = useState("");
  const [inviteEditToken, setInviteEditToken] = useState("");
  const [inviteEditLabel, setInviteEditLabel] = useState("");
  const [inviteEditMaxUses, setInviteEditMaxUses] = useState("");
  const [inviteEditExpires, setInviteEditExpires] = useState("");

  const loadInviteLinks = useCallback(async () => {
    if (!cid || !isGroupAdmin) return;
    try {
      const { data } = await api.get(`/conversation/${cid}/invites`);
      setInviteLinks(Array.isArray(data) ? data : []);
    } catch {
      setInviteLinks([]);
    }
  }, [cid, isGroupAdmin]);

  useEffect(() => {
    void loadInviteLinks();
  }, [loadInviteLinks]);

  const loadModerationLog = useCallback(async () => {
    if (!cid || !isGroupAdmin) return;
    try {
      const { data } = await api.get(`/conversation/${cid}/audit`);
      setModerationLog(Array.isArray(data) ? data : []);
    } catch {
      setModerationLog([]);
    }
  }, [cid, isGroupAdmin]);

  useEffect(() => {
    void loadModerationLog();
  }, [loadModerationLog]);

  const addMemberInstant = useCallback(
    async (member: ConversationMember) => {
      try {
        await api.post(`/conversation/${cid}/members`, {
          memberIds: [member._id],
        });
        await refreshConversationList();
        notify(activeConv?.isChannel ? t("channelMembersAdded") : t("groupMembersAdded"));
      } catch (e) {
        notify(formatApiError(e, t, "inviteActionFailed"));
        throw e;
      }
    },
    [activeConv?.isChannel, cid, notify, refreshConversationList, t],
  );

  if (!(activeConv?.isGroup || activeConv?.isChannel)) return null;
  if (!isGroupAdmin) return null;

  const patchConv = (conv: Conversation) => {
    dispatch(patchConversationInList(conv));
    onConversationChange(conv);
  };

  const submitBan = async (memberId: string, expiresAt: string | null) => {
    try {
      const { data } = await api.post(`/conversation/${cid}/ban`, {
        userId: memberId,
        expiresAt,
      });
      if (data?.deleted) {
        await refreshConversationList();
        router.push("/chats");
      } else if (data?._id) {
        patchConv(data);
        await refreshConversationList();
      } else {
        await refreshConversationList();
      }
      setBanTargetMemberId(null);
      notify(t("settingsSaved"));
    } catch (e) {
      notify(formatApiError(e, t, "inviteActionFailed"));
    }
  };

  const isChannel = Boolean(activeConv?.isChannel);

  return (
    <div dir={dir} className="space-y-6 pb-8">
      {isGroupAdmin ? (
        <section className="vs-settings-card space-y-4">
          <div className="text-start">
            <h2 className="text-base font-semibold text-ink">
              {isChannel ? t("channelManageMembersTitle") : t("manageMembersTitle")}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {isChannel ? t("channelManageMembersHint") : t("manageMembersHint")}
            </p>
          </div>
          <MemberPicker
            title={t("memberPickerTitle")}
            placeholder={t("memberPickerContactsPlaceholder")}
            selectedUsers={[]}
            onChange={() => {}}
            initialSuggestions={memberManagementSuggestions}
            excludeIds={[
              ...(activeConv?.members || []).map((member) =>
                String(member?._id || member || ""),
              ),
              String(user?._id || ""),
            ]}
            emptyText={t("memberPickerContactsEmpty")}
            loadingText={t("memberPickerSearching")}
            addLabel={t("groupAddMember")}
            contactsOnly
            instantAdd
            onInstantAdd={addMemberInstant}
          />
        </section>
      ) : null}

      {isGroupAdmin ? (
        <>
          <section className="vs-settings-card space-y-4">
            <div className="text-start">
              <h2 className="text-base font-semibold text-ink">
                {isChannel ? t("channelAdminSection") : t("groupAdminSection")}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {isChannel
                  ? t("channelManageMembersCurrentHint")
                  : t("manageMembersCurrentHint")}
              </p>
            </div>
            <div className="space-y-3">
              {(activeConv?.members || []).map((member) => {
                const memberId = String(member?._id || member || "");
                const isSelf = memberId === String(user?._id || "");
                const isAdmin = (
                  (activeConv?.admins as Array<{ _id?: string } | string> | undefined) || []
                ).some(
                  (adminId) =>
                    String(
                      typeof adminId === "object" && adminId?._id ? adminId._id : adminId || "",
                    ) === memberId,
                );
                const peerRights = getEffectiveMemberRightsForPeer(activeConv, memberId);

                return (
                  <div
                    key={memberId}
                    className="rounded-2xl border border-brand-200/45 bg-surface/85 p-3 dark:border-brand-800/35 dark:bg-brand-900/15"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1 text-start">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-semibold text-ink">
                            {member?.name || member?.email || memberId}
                          </span>
                          <span className="vs-chip-current px-2 py-0.5 text-[10px]">
                            {isAdmin
                              ? t("groupRoleAdmin")
                              : isChannel
                                ? t("channelRoleSubscriber")
                                : t("groupRoleMember")}
                          </span>
                          {isSelf ? (
                            <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-800 dark:bg-brand-900/40 dark:text-brand-200">
                              {t("groupRoleYou")}
                            </span>
                          ) : null}
                        </div>
                        <div className="truncate text-xs text-muted">
                          {member?.username
                            ? `@${String(member.username).replace(/^@+/, "")}`
                            : member?.email || memberId}
                        </div>
                      </div>
                      {!isSelf ? (
                        <div className="flex flex-wrap gap-2">
                          {!isAdmin ? (
                            <button
                              type="button"
                              className="vs-btn-outline-sm rounded-full px-3 py-1.5 text-[11px]"
                              onClick={async () => {
                                try {
                                  await api.post(`/conversation/${cid}/admins`, {
                                    userId: memberId,
                                  });
                                  await refreshConversationList();
                                  notify(t("settingsSaved"));
                                } catch (e) {
                                  notify(formatApiError(e, t, "inviteActionFailed"));
                                }
                              }}
                            >
                              {t("groupPromoteAdmin")}
                            </button>
                          ) : ((activeConv?.admins as unknown[] | undefined)?.length || 0) > 1 ? (
                            <button
                              type="button"
                              className="vs-btn-outline-sm rounded-full px-3 py-1.5 text-[11px]"
                              onClick={async () => {
                                try {
                                  await api.delete(`/conversation/${cid}/admins/${memberId}`);
                                  await refreshConversationList();
                                  notify(t("settingsSaved"));
                                } catch (e) {
                                  notify(formatApiError(e, t, "inviteActionFailed"));
                                }
                              }}
                            >
                              {t("groupDemoteAdmin")}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="rounded-full border border-red-300/80 bg-red-50 px-3 py-1.5 text-[11px] font-semibold text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
                            onClick={() => {
                              setBanTargetMemberId(memberId);
                              setBanDraftUntil(banUntilValue || "");
                            }}
                          >
                            {t("groupBanMember")}
                          </button>
                          <button
                            type="button"
                            className="rounded-full bg-red-600/90 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-red-600"
                            onClick={async () => {
                              try {
                                await api.delete(`/conversation/${cid}/members/${memberId}`);
                                await refreshConversationList();
                                notify(t("settingsSaved"));
                              } catch (e) {
                                notify(formatApiError(e, t, "inviteActionFailed"));
                              }
                            }}
                          >
                            {t("groupRemoveMember")}
                          </button>
                        </div>
                      ) : null}
                      {banTargetMemberId === memberId ? (
                        <div className="mt-3 rounded-xl border border-red-200/70 bg-red-50/50 p-3 dark:border-red-900/40 dark:bg-red-950/20">
                          <label
                            htmlFor={`ban-until-${memberId}`}
                            className="block text-[10px] font-semibold uppercase tracking-wide text-red-900 dark:text-red-200"
                          >
                            {t("groupBanPrompt", {
                              example: toDateTimeLocalValue(
                                new Date(Date.now() + 60 * 60 * 1000),
                              ),
                            })}
                          </label>
                          <input
                            id={`ban-until-${memberId}`}
                            type="datetime-local"
                            value={banDraftUntil}
                            onChange={(e) => setBanDraftUntil(e.target.value)}
                            className="vs-input mt-2"
                          />
                          <div className="mt-2 flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="rounded-full bg-red-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-red-700"
                              onClick={() => {
                                const trimmed = String(banDraftUntil || "").trim();
                                setBanUntilValue(trimmed);
                                void submitBan(
                                  memberId,
                                  trimmed ? trimmed : null,
                                );
                              }}
                            >
                              {t("groupBanMember")}
                            </button>
                            <button
                              type="button"
                              className="vs-btn-outline-sm rounded-full px-3 py-1.5 text-[11px]"
                              onClick={() => setBanTargetMemberId(null)}
                            >
                              {t("cancel")}
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                    {!isAdmin ? (
                      <div className="mt-3 border-t border-brand-200/35 pt-3 dark:border-brand-800/30">
                        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted">
                          {t("memberPermMemberTitle")}
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {(
                            [
                              { key: "canPostMessages", label: t("memberPermPost") },
                              { key: "canAddMembers", label: t("memberPermAdd") },
                              { key: "canPinMessages", label: t("memberPermPin") },
                              { key: "canEditInfo", label: t("memberPermEdit") },
                            ] as const
                          ).map((row) => (
                            <SettingsToggleRow
                              key={row.key}
                              label={row.label}
                              checked={Boolean(peerRights[row.key])}
                              disabled={!isGroupAdmin}
                              onChange={async (next) => {
                                try {
                                  const { data: conv } = await api.patch(
                                    `/conversation/${cid}/members/${memberId}/permissions`,
                                    { [row.key]: next },
                                  );
                                  patchConv(conv);
                                  notify(t("settingsSaved"));
                                } catch (err) {
                                  notify(formatApiError(err, t, "inviteActionFailed"));
                                }
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="vs-settings-card space-y-4">
            <h2 className="text-start text-base font-semibold text-ink">
              {isChannel ? t("channelDefaultRightsTitle") : t("groupDefaultRightsTitle")}
            </h2>
            {isChannel ? (
              <div className="text-start">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  {t("channelPostingMode")}
                </div>
                <div className="flex flex-wrap gap-2">
                  {(["admins_only", "all"] as const).map((mode) => {
                    const currentMode =
                      String(activeConv.channelPostingMode || "admins_only") === "all"
                        ? "all"
                        : "admins_only";
                    const selected = mode === currentMode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        className={cn(
                          "rounded-full border px-3 py-2 text-xs font-semibold transition",
                          selected
                            ? "border-brand-300 bg-brand-50 text-brand-800 dark:border-brand-700 dark:bg-brand-900/30 dark:text-brand-200"
                            : "border-brand-200/50 bg-surface text-muted hover:bg-brand-50/60 dark:border-brand-800/40",
                        )}
                        onClick={async () => {
                          if (selected) return;
                          try {
                            const { data: conv } = await api.patch(`/conversation/${cid}/settings`, {
                              channelPostingMode: mode,
                            });
                            patchConv(conv);
                            notify(t("settingsSaved"));
                          } catch (err) {
                            notify(formatApiError(err, t, "inviteActionFailed"));
                          }
                        }}
                      >
                        {mode === "admins_only"
                          ? t("channelPostingAdminsOnly")
                          : t("channelPostingAll")}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  {
                    key: "canPostMessages" as const,
                    label: t("memberPermPost"),
                    value:
                      (activeConv?.defaultMemberRights as Record<string, boolean> | undefined)
                        ?.canPostMessages !== false,
                  },
                  {
                    key: "canAddMembers" as const,
                    label: t("memberPermAdd"),
                    value:
                      (activeConv?.defaultMemberRights as Record<string, boolean> | undefined)
                        ?.canAddMembers !== false,
                  },
                  {
                    key: "canPinMessages" as const,
                    label: t("memberPermPin"),
                    value: Boolean(
                      (activeConv?.defaultMemberRights as Record<string, boolean> | undefined)
                        ?.canPinMessages,
                    ),
                  },
                  {
                    key: "canEditInfo" as const,
                    label: t("memberPermEdit"),
                    value: Boolean(
                      (activeConv?.defaultMemberRights as Record<string, boolean> | undefined)
                        ?.canEditInfo,
                    ),
                  },
                ]
              ).map((row) => (
                <SettingsToggleRow
                  key={row.key}
                  label={row.label}
                  checked={row.value}
                  disabled={!isGroupAdmin}
                  onChange={async (next) => {
                    try {
                      const { data: conv } = await api.patch(`/conversation/${cid}/settings`, {
                        defaultMemberRights: { [row.key]: next },
                      });
                      patchConv(conv);
                      notify(t("settingsSaved"));
                    } catch (err) {
                      notify(formatApiError(err, t, "inviteActionFailed"));
                    }
                  }}
                />
              ))}
            </div>
          </section>

          <section className="vs-settings-card space-y-4">
            <div className="text-start">
              <h2 className="text-base font-semibold text-ink">{t("chatInviteSection")}</h2>
            </div>
            <button
              type="button"
              className="vs-btn-primary inline-flex min-h-10 w-full items-center justify-center gap-2 px-4 py-2 text-sm sm:w-auto"
              onClick={async () => {
                try {
                  const { data } = await api.post(`/conversation/${cid}/invites`, {});
                  const path = String(data?.path || "");
                  const origin = typeof window !== "undefined" ? window.location.origin : "";
                  const full = path.startsWith("http") ? path : `${origin}${path}`;
                  await navigator.clipboard.writeText(full);
                  notify(t("chatInviteCopied"));
                  await loadInviteLinks();
                } catch (e) {
                  notify(formatApiError(e, t, "inviteActionFailed"));
                }
              }}
            >
              {t("chatCreateInvite")}
            </button>
            {inviteLinks.length > 0 ? (
              <ul className="space-y-2">
                {inviteLinks.map((link) => {
                  const tok = String(link.token || "");
                  const full =
                    typeof window !== "undefined" && link.path
                      ? `${window.location.origin}${link.path}`
                      : "";
                  return (
                    <li
                      key={tok}
                      className="rounded-2xl border border-brand-200/45 px-3 py-3 dark:border-brand-800/35"
                    >
                      <div className="text-xs text-muted">
                        {String(link.label || tok.slice(0, 8))}
                        {link.revokedAt
                          ? ` · ${t("revoked")}`
                          : ` · ${t("inviteLinkUses", { count: Number(link.usesCount) || 0 })}`}
                      </div>
                      {!link.revokedAt ? (
                        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                          {inviteEditToken === tok ? (
                            <div className="flex w-full flex-col gap-2">
                              <input
                                className="vs-input text-xs"
                                value={inviteEditLabel}
                                onChange={(e) => setInviteEditLabel(e.target.value)}
                                placeholder={t("inviteLinkLabelPlaceholder")}
                              />
                              <input
                                className="vs-input text-xs"
                                type="number"
                                min={1}
                                value={inviteEditMaxUses}
                                onChange={(e) => setInviteEditMaxUses(e.target.value)}
                                placeholder={t("inviteLinkMaxUsesPlaceholder")}
                              />
                              <input
                                className="vs-input text-xs"
                                type="datetime-local"
                                value={inviteEditExpires}
                                onChange={(e) => setInviteEditExpires(e.target.value)}
                              />
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  className="vs-btn-primary-sm"
                                  onClick={async () => {
                                    try {
                                      const body: Record<string, unknown> = {
                                        label: inviteEditLabel.trim(),
                                      };
                                      body.maxUses = inviteEditMaxUses.trim()
                                        ? Number(inviteEditMaxUses)
                                        : null;
                                      body.expiresAt = inviteEditExpires
                                        ? new Date(inviteEditExpires).toISOString()
                                        : null;
                                      await api.patch(`/conversation/${cid}/invites/${tok}`, body);
                                      setInviteEditToken("");
                                      await loadInviteLinks();
                                      notify(t("inviteLinkEditDone"));
                                    } catch (e) {
                                      notify(formatApiError(e, t, "inviteActionFailed"));
                                    }
                                  }}
                                >
                                  {t("inviteLinkSave")}
                                </button>
                                <button
                                  type="button"
                                  className="text-xs font-semibold text-muted"
                                  onClick={() => setInviteEditToken("")}
                                >
                                  {t("cancel")}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {full ? (
                                <button
                                  type="button"
                                  className="text-xs font-semibold text-brand-600"
                                  onClick={async () => {
                                    await navigator.clipboard.writeText(full);
                                    notify(t("chatInviteCopied"));
                                  }}
                                >
                                  {t("inviteLinkCopy")}
                                </button>
                              ) : null}
                              <button
                                type="button"
                                className="text-xs font-semibold text-brand-600"
                                onClick={() => {
                                  setInviteEditToken(tok);
                                  setInviteEditLabel(String(link.label || ""));
                                  setInviteEditMaxUses(
                                    link.maxUses != null ? String(link.maxUses) : "",
                                  );
                                  setInviteEditExpires(
                                    link.expiresAt
                                      ? toDateTimeLocalValue(link.expiresAt)
                                      : "",
                                  );
                                }}
                              >
                                {t("inviteLinkEdit")}
                              </button>
                              <button
                                type="button"
                                className="text-xs font-semibold text-red-600"
                                onClick={async () => {
                                  try {
                                    await api.delete(`/conversation/${cid}/invites/${tok}`);
                                    await loadInviteLinks();
                                    notify(t("settingsSaved"));
                                  } catch (e) {
                                    notify(formatApiError(e, t, "inviteActionFailed"));
                                  }
                                }}
                              >
                                {t("inviteLinkRevoke")}
                              </button>
                            </>
                          )}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </section>

          <section className="vs-settings-card space-y-3">
            <h2 className="text-start text-base font-semibold text-ink">
              {t("moderationLogTitle")}
            </h2>
            {moderationLog.length === 0 ? (
              <p className="text-sm text-muted">{t("moderationLogEmpty")}</p>
            ) : (
              <ul className="max-h-48 space-y-2 overflow-y-auto">
                {moderationLog.slice(0, 40).map((row, idx) => (
                  <li
                    key={`${String(row.action)}-${idx}`}
                    className="rounded-xl border border-brand-200/45 px-3 py-2 text-xs dark:border-brand-800/35"
                  >
                    <span className="font-semibold text-ink">{String(row.action || "—")}</span>
                    {row.actorId &&
                    typeof row.actorId === "object" &&
                    "name" in row.actorId &&
                    row.actorId.name ? (
                      <span className="text-muted"> · {String(row.actorId.name)}</span>
                    ) : null}
                    {row.createdAt ? (
                      <div className="mt-0.5 text-[10px] text-muted">
                        {formatCompactDateTime(row.createdAt, i18n.language)}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {isGroupAdmin && (activeConv?.isGroup || activeConv?.isChannel) ? (
            <section className="vs-settings-card space-y-4">
              <div className="text-start">
                <h2 className="text-base font-semibold text-ink">{t("topicsManageTitle")}</h2>
                <p className="mt-1 text-sm text-muted">
                  {isChannel ? t("topicsManageIntro") : t("groupTopicsManageIntro")}
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  className="vs-input min-w-0 flex-1"
                  value={topicName}
                  onChange={(e) => setTopicName(e.target.value)}
                  placeholder={t("topicCreatePlaceholder")}
                />
                <button
                  type="button"
                  className="vs-btn-primary-sm shrink-0"
                  disabled={!topicName.trim()}
                  onClick={async () => {
                    try {
                      const { data: conv } = await api.post(`/conversation/${cid}/topics`, {
                        name: topicName.trim(),
                      });
                      patchConv(conv);
                      setTopicName("");
                      notify(t("topicCreated"));
                    } catch (e) {
                      notify(formatApiError(e, t, "inviteActionFailed"));
                    }
                  }}
                >
                  {t("topicCreateAction")}
                </button>
              </div>
              <ul className="space-y-2">
                {(
                  (activeConv?.topics as Array<{
                    id?: string;
                    name?: string;
                    archived?: boolean;
                  }> | undefined) || []
                )
                  .filter((topic) => !topic.archived)
                  .map((topic) => (
                    <li
                      key={String(topic.id)}
                      className="flex flex-col gap-2 rounded-xl border border-brand-200/45 px-3 py-2 sm:flex-row sm:items-center sm:justify-between dark:border-brand-800/35"
                    >
                      {topicEditId === topic.id ? (
                        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                          <input
                            className="vs-input min-w-[8rem] flex-1 text-sm"
                            value={topicEditName}
                            onChange={(e) => setTopicEditName(e.target.value)}
                          />
                          <button
                            type="button"
                            className="vs-btn-primary-sm"
                            disabled={!topicEditName.trim()}
                            onClick={async () => {
                              try {
                                const { data: conv } = await api.patch(
                                  `/conversation/${cid}/topics/${topic.id}`,
                                  { name: topicEditName.trim() },
                                );
                                patchConv(conv);
                                setTopicEditId("");
                                notify(t("topicRenamed"));
                              } catch (e) {
                                notify(formatApiError(e, t, "inviteActionFailed"));
                              }
                            }}
                          >
                            {t("topicSaveAction")}
                          </button>
                          <button
                            type="button"
                            className="text-xs font-semibold text-muted"
                            onClick={() => setTopicEditId("")}
                          >
                            {t("cancel")}
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="font-medium text-ink">{topic.name || topic.id}</span>
                          {String(topic.id) !== "general" ? (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                className="text-xs font-semibold text-brand-600"
                                onClick={() => {
                                  setTopicEditId(String(topic.id));
                                  setTopicEditName(String(topic.name || topic.id));
                                }}
                              >
                                {t("topicRenameAction")}
                              </button>
                              <button
                                type="button"
                                className="text-xs font-semibold text-red-600"
                                onClick={async () => {
                                  try {
                                    const { data: conv } = await api.delete(
                                      `/conversation/${cid}/topics/${topic.id}`,
                                    );
                                    patchConv(conv);
                                    notify(t("topicArchived"));
                                  } catch (e) {
                                    notify(formatApiError(e, t, "inviteActionFailed"));
                                  }
                                }}
                              >
                                {t("topicArchiveAction")}
                              </button>
                            </div>
                          ) : null}
                        </>
                      )}
                    </li>
                  ))}
              </ul>
            </section>
          ) : null}

          {activeBans.length > 0 ? (
            <section className="vs-settings-card space-y-3">
              <div className="text-start">
                <h2 className="text-base font-semibold text-ink">{t("bannedUsersSection")}</h2>
                <p className="mt-1 text-sm text-muted">{t("bannedUsersHint")}</p>
              </div>
              <ul className="space-y-2">
                {activeBans.map((b) => {
                  const bid = String(
                    (b.userId as { _id?: string } | string)?.["_id"] ||
                      b.userId ||
                      "",
                  );
                  const userRef = b.userId as { name?: string; email?: string } | undefined;
                  const until = b.expiresAt
                    ? formatCompactDateTime(b.expiresAt, i18n.language)
                    : "";
                  return (
                    <li
                      key={bid}
                      className="flex flex-col gap-2 rounded-2xl border border-brand-200/45 px-3 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-brand-800/35"
                    >
                      <div className="min-w-0 text-start">
                        <div className="truncate text-sm font-medium text-ink">
                          {userRef?.name || userRef?.email || bid}
                        </div>
                        <div className="text-xs text-muted">
                          {b.expiresAt
                            ? t("banUntilLabel", { at: until })
                            : t("banPermanentLabel")}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="rounded-full border border-red-300/80 bg-red-50 px-3 py-1.5 text-[11px] font-semibold text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100"
                        onClick={async () => {
                          try {
                            const { data: conv } = await api.delete(
                              `/conversation/${cid}/ban/${bid}`,
                            );
                            patchConv(conv);
                            await refreshConversationList();
                            notify(t("settingsSaved"));
                          } catch (err) {
                            notify(formatApiError(err, t, "inviteActionFailed"));
                          }
                        }}
                      >
                        {t("groupUnbanMember")}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
