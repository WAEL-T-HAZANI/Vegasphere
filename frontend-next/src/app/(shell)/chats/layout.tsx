"use client";

import ChatsInboxPanel from "@/components/chats/ChatsInboxPanel";
import { useMinLg } from "@/hooks/useMinLg";

export default function ChatsLayout({ children }) {
  const isLg = useMinLg();

  return (
    <div className="vs-chats-page flex min-h-0 min-w-0 flex-1 flex-col lg:flex-row">
      {isLg ? (
        <div className="flex min-h-0 w-full shrink-0 flex-col border-e border-brand-200/45 dark:border-brand-800/35 lg:w-[min(100%,340px)] xl:w-[min(100%,380px)]">
          <ChatsInboxPanel compact />
        </div>
      ) : null}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
