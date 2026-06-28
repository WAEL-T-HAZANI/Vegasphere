import { smartReplyContextText } from "@/lib/messageFormat";

export type SmartReplyContextEntry = {
  sender: "me" | "them";
  text: string;
};

export type SmartReplyContextResult = {
  recentMessages: SmartReplyContextEntry[];
  triggerKey: string;
  subject: string;
  conversationKind: "dm" | "group" | "channel" | "self";
};

type MessageLike = {
  _id?: string;
  senderId?: { _id?: string; name?: string; email?: string } | string;
  sender?: { _id?: string; name?: string; email?: string } | string;
  e2eVersion?: number;
  text?: string;
  messageType?: string;
  [key: string]: unknown;
};

type ConversationLike = {
  isGroup?: boolean;
  isChannel?: boolean;
  isSelfChat?: boolean;
  name?: string;
  chatName?: string;
};

export function resolveMessageSenderId(message: MessageLike | null | undefined): string {
  const raw = message?.senderId ?? message?.sender;
  if (raw && typeof raw === "object") {
    const id = (raw as { _id?: string })._id;
    if (id) return String(id);
  }
  return String(raw || "");
}

function resolveSenderLabel(
  message: MessageLike,
  memberLabels: Record<string, string>,
): string {
  const senderId = resolveMessageSenderId(message);
  if (senderId && memberLabels[senderId]) return memberLabels[senderId];

  const populated = message.senderId ?? message.sender;
  if (populated && typeof populated === "object") {
    const name = String(
      (populated as { name?: string; email?: string }).name ||
        (populated as { email?: string }).email ||
        "",
    ).trim();
    if (name) return name.split(/\s+/)[0] || name;
  }
  return "";
}

function messageContextText(
  message: MessageLike,
  decryptedById: Record<string, string>,
  t: (_key: string) => string,
): string {
  const decrypted =
    Number(message.e2eVersion) > 0
      ? decryptedById[String(message._id)] || ""
      : undefined;
  return smartReplyContextText(message, decrypted, t);
}

export function buildSmartReplyContext({
  messages,
  meId,
  decryptedById,
  t,
  activeConv,
  peerDisplayName = "",
  memberLabels = {},
  maxMessages = 18,
}: {
  messages: MessageLike[];
  meId: string;
  decryptedById: Record<string, string>;
  t: (_key: string) => string;
  activeConv: ConversationLike | null | undefined;
  peerDisplayName?: string;
  memberLabels?: Record<string, string>;
  maxMessages?: number;
}): SmartReplyContextResult {
  const me = String(meId || "");
  const slice = messages.slice(-maxMessages);
  const isGroup = Boolean(activeConv?.isGroup);
  const isChannel = Boolean(activeConv?.isChannel);
  const isGroupish = isGroup || isChannel;

  const toEntry = (m: MessageLike): SmartReplyContextEntry | null => {
    const senderId = resolveMessageSenderId(m);
    let text = messageContextText(m, decryptedById, t);
    if (!text) return null;

    if (isGroupish && senderId && senderId !== me) {
      const label = resolveSenderLabel(m, memberLabels);
      if (label && !text.startsWith(`${label}:`)) {
        text = `${label}: ${text}`;
      }
    }

    return {
      sender: senderId === me ? "me" : "them",
      text,
    };
  };

  const recentMessages = slice
    .map(toEntry)
    .filter((entry): entry is SmartReplyContextEntry => Boolean(entry));

  const lastIncomingMsg = [...slice].reverse().find((m) => {
    const senderId = resolveMessageSenderId(m);
    if (!senderId || senderId === me) return false;
    return Boolean(messageContextText(m, decryptedById, t).trim());
  });

  const lastIncomingPreview = lastIncomingMsg
    ? messageContextText(lastIncomingMsg, decryptedById, t)
    : "";

  let conversationKind: SmartReplyContextResult["conversationKind"] = "dm";
  if (activeConv?.isSelfChat) conversationKind = "self";
  else if (isChannel) conversationKind = "channel";
  else if (isGroup) conversationKind = "group";

  let subject = "";
  if (activeConv?.isSelfChat) {
    subject = t("navSaved");
  } else if (isGroupish) {
    subject = String(activeConv?.name || activeConv?.chatName || "").trim();
  } else {
    subject = String(peerDisplayName || activeConv?.name || activeConv?.chatName || "").trim();
  }

  return {
    recentMessages,
    triggerKey:
      lastIncomingMsg?._id && lastIncomingPreview
        ? `${String(lastIncomingMsg._id)}:${lastIncomingPreview.slice(0, 96)}`
        : "",
    subject,
    conversationKind,
  };
}
