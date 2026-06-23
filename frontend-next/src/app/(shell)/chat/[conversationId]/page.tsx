"use client";

import { useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

/** Legacy route — redirect to split-pane chats URL while preserving query params. */
export default function LegacyChatConversationPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationId = String(params?.conversationId ?? "");

  useEffect(() => {
    if (!conversationId) {
      router.replace("/chats");
      return;
    }
    const qs = searchParams.toString();
    router.replace(qs ? `/chats/${conversationId}?${qs}` : `/chats/${conversationId}`);
  }, [conversationId, router, searchParams]);

  return null;
}
