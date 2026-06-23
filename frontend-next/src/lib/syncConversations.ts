import { conversationClient } from "@/lib/clients";
import { setConversations } from "@/store/slices/chatSlice";
import type { AppDispatch } from "@/store";

export async function syncConversations(dispatch: AppDispatch) {
  const { data } = await conversationClient.listConversations();
  dispatch(setConversations(data || []));
}
