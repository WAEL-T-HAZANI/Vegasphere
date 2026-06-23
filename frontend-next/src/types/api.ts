/** Shared API / domain shapes for Vegasphere frontend. */

export type ObjectId = string;

export interface User {
  _id: ObjectId;
  name?: string;
  email?: string;
  username?: string;
  profilePic?: string;
  e2ePublicKey?: string;
  emailVerified?: boolean;
  twoStepEnabled?: boolean;
  destructiveMaintenanceAllowed?: boolean;
  doNotDisturb?: boolean;
  pushNotificationsEnabled?: boolean;
  notificationRules?: {
    direct?: boolean;
    groups?: boolean;
    mentions?: boolean;
    sound?: boolean;
  };
  [key: string]: unknown;
}

export interface ConversationMember extends Partial<User> {
  _id?: ObjectId;
}

export interface Conversation {
  _id: ObjectId;
  isGroup?: boolean;
  isChannel?: boolean;
  isSelfChat?: boolean;
  channelSlug?: string;
  visibility?: "public" | "private" | string;
  channelPostingMode?: "all" | "admins_only" | string;
  description?: string;
  name?: string;
  avatar?: string;
  chatName?: string;
  updatedAt?: string;
  admins?: Array<ConversationMember | ObjectId>;
  viewerIsAdmin?: boolean;
  memberCount?: number;
  e2eEnabled?: boolean;
  members?: ConversationMember[];
  latestmessage?: string;
  effectiveMemberRights?: {
    canPostMessages?: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface MessagePollOption {
  id: string;
  text?: string;
  voterIds?: Array<ObjectId | { _id?: ObjectId }>;
}

export interface Message {
  _id: ObjectId;
  conversationId?: ObjectId;
  senderId?: ObjectId | User;
  text?: string;
  messageType?: string;
  createdAt?: string;
  scheduledFor?: string;
  expiresAt?: string;
  disappearAfterSec?: number;
  deletedForEveryone?: boolean;
  isPinned?: boolean;
  replyTo?: ObjectId | Message;
  forwardedFrom?: {
    previewText?: string;
    originalSenderName?: string;
  };
  poll?: {
    options?: MessagePollOption[];
    [key: string]: unknown;
  };
  mentionedUserIds?: ObjectId[];
  starredBy?: Array<ObjectId | { _id?: ObjectId }>;
  imageUrl?: string;
  fileData?: string;
  fileType?: string;
  fileName?: string;
  audioData?: string;
  location?: { lat?: number; lng?: number; label?: string };
  viewOnce?: boolean;
  e2eVersion?: number;
  topicId?: string;
  topicName?: string;
  [key: string]: unknown;
}

export interface AppNotification {
  _id: ObjectId;
  recipientId?: ObjectId;
  actorId?: User | ObjectId | null;
  type: "chat_invite" | "mention" | "call_invite";
  link?: string;
  data?: {
    status?: "pending" | "accepted" | "declined" | "cancelled";
    conversationId?: ObjectId;
    conversationName?: string;
    messageId?: ObjectId;
    preview?: string;
    callInviteId?: ObjectId;
    callToken?: string;
    callMode?: "audio" | "video" | "";
    callTitle?: string;
    scheduledFor?: string | null;
    [key: string]: unknown;
  };
  readAt?: string | null;
  dismissedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface NotificationsPayload {
  items: AppNotification[];
  unreadCount: number;
}

export interface ApiErrorBody {
  success?: false;
  error?: string;
  message?: string;
  details?: Record<string, unknown>;
}

export interface PresenceEntry {
  online?: boolean;
  lastSeen?: string;
  [key: string]: unknown;
}

export type PresenceMap = Record<string, PresenceEntry>;
