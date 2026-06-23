export type StatusUserRef = {
  _id?: string;
  name?: string;
  profilePic?: string;
};

export type StatusViewer = {
  userId?: StatusUserRef | string;
  viewedAt?: string;
};

export type StatusReply = {
  userId?: string;
  authorName?: string;
  text?: string;
  createdAt?: string | null;
};

export type StatusReaction = {
  emoji?: string;
  userId?: string;
};

export type StatusItem = {
  _id: string;
  text?: string;
  imageUrl?: string;
  userId?: StatusUserRef | string;
  createdAt?: string;
  expiresAt?: string;
  viewers?: StatusViewer[];
  hasViewed?: boolean;
  reactions?: StatusReaction[];
  replies?: StatusReply[];
  viewerCount?: number;
  reactionCount?: number;
  replyCount?: number;
  myReactionEmoji?: string | null;
  /** Replies from the current viewer (feed cards only). */
  myReplies?: StatusReply[];
};

export type StatusAudience = {
  peerCount: number;
};

export function statusOwnerName(item: StatusItem): string {
  const u = item.userId;
  if (u && typeof u === "object") return String(u.name || "").trim();
  return "";
}

export function statusOwnerId(item: StatusItem): string {
  const u = item.userId;
  if (u && typeof u === "object") return String(u._id || "").trim();
  if (typeof u === "string") return u.trim();
  return "";
}

export function statusOwnerAvatar(item: StatusItem): string {
  const u = item.userId;
  if (u && typeof u === "object") return String(u.profilePic || "").trim();
  return "";
}
