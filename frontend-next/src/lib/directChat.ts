import type { TFunction } from "i18next";
import type { AppDispatch } from "@/store";
import { conversationClient, userClient } from "@/lib/clients";
import { formatApiError } from "@/lib/apiError";
import { showAppToast } from "@/lib/appToast";
import { dmPeerUserId } from "@/lib/chatList";
import { syncConversations } from "@/lib/syncConversations";
import { api } from "@/lib/api";
import type { Conversation } from "@/types/api";

type ConversationLike = {
  _id?: string;
  isGroup?: boolean;
  isChannel?: boolean;
  isSelfChat?: boolean;
  members?: unknown[];
};

export function findExistingDirectChat(
  conversations: ConversationLike[] | undefined,
  myUserId: string,
  otherUserId: string,
) {
  const other = String(otherUserId || "");
  const me = String(myUserId || "");
  if (!other || !me || other === me) return null;
  return (conversations || []).find((conv) => {
    if (!conv || conv.isGroup || conv.isChannel || conv.isSelfChat) return false;
    return dmPeerUserId(conv, me) === other;
  });
}

function isChatInviteRequiredError(err: unknown) {
  const msg = String(
    (err as { response?: { data?: { message?: string } } })?.response?.data
      ?.message || "",
  ).toLowerCase();
  return msg.includes("chat invite required");
}

export type OpenOrRequestDirectChatResult =
  | { ok: true; kind: "opened"; conversationId: string }
  | { ok: true; kind: "invited" }
  | { ok: false; error: string };

/** Open an existing DM, accept their pending invite, or send a chat invite. */
export async function openOrRequestDirectChat(options: {
  myUserId: string;
  otherUserId: string;
  conversations?: ConversationLike[];
  dispatch: AppDispatch;
  t: TFunction;
}): Promise<OpenOrRequestDirectChatResult> {
  const { myUserId, otherUserId, conversations, dispatch, t } = options;
  const me = String(myUserId || "");
  const other = String(otherUserId || "");
  if (!me || !other || me === other) {
    return { ok: false, error: t("errorOccurred") };
  }

  const local = findExistingDirectChat(conversations, me, other);
  if (local?._id) {
    return { ok: true, kind: "opened", conversationId: String(local._id) };
  }

  try {
    const { data: incoming } = await api.get<Array<{ _id?: string }>>(
      "/user/invites/incoming",
    );
    const theyInvitedMe = (incoming || []).some(
      (row) => String(row._id || "") === other,
    );
    if (theyInvitedMe) {
      const { data } = await api.post<Conversation>(
        `/user/invites/${encodeURIComponent(other)}/accept`,
      );
      await syncConversations(dispatch);
      if (data?._id) {
        return { ok: true, kind: "opened", conversationId: String(data._id) };
      }
    }
  } catch (err) {
    return { ok: false, error: formatApiError(err, t, "errorOccurred") };
  }

  try {
    const { data } = await conversationClient.createDirectConversation([me, other]);
    await syncConversations(dispatch);
    if (data?._id) {
      return { ok: true, kind: "opened", conversationId: String(data._id) };
    }
  } catch (err) {
    if (!isChatInviteRequiredError(err)) {
      return { ok: false, error: formatApiError(err, t, "errorOccurred") };
    }
  }

  try {
    await userClient.sendChatInvite(other);
    showAppToast({ id: "chat-invite-sent", body: t("chatInviteSent") });
    return { ok: true, kind: "invited" };
  } catch (err) {
    return { ok: false, error: formatApiError(err, t, "errorOccurred") };
  }
}
