"use client";

import { useTranslation } from "react-i18next";
import ChatsInboxPanel from "@/components/chats/ChatsInboxPanel";
import { useMinLg } from "@/hooks/useMinLg";

export default function ChatListPage() {
  const { t } = useTranslation();
  const isLg = useMinLg();

  if (isLg) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-base font-semibold text-ink">{t("chatSelectConversation")}</p>
        <p className="mt-2 max-w-sm text-sm text-muted">{t("chatSelectConversationHint")}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ChatsInboxPanel />
    </div>
  );
}
