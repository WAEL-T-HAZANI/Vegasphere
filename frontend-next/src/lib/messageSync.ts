import { api } from "@/lib/api";
import { appendMessage } from "@/store/slices/chatSlice";
import type { AppDispatch } from "@/store";
import type { Message } from "@/types";

const SYNC_CURSOR_KEY = "vegasphere_msg_sync_since";

/** Pull missed messages after reconnect (backend `GET /message/sync`). */
export async function pullMessageSync(dispatch: AppDispatch): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const since = localStorage.getItem(SYNC_CURSOR_KEY) || "";
    const { data } = await api.get<{
      messages?: Message[];
      serverTime?: string;
      hasMore?: boolean;
    }>("/message/sync", {
      params: {
        ...(since ? { since } : {}),
        limit: 200,
      },
    });
    const messages = Array.isArray(data?.messages) ? data.messages : [];
    for (const message of messages) {
      if (message?._id) dispatch(appendMessage(message));
    }
    if (data?.serverTime) {
      localStorage.setItem(SYNC_CURSOR_KEY, data.serverTime);
    }
  } catch {
    /* sync is best-effort on reconnect */
  }
}
