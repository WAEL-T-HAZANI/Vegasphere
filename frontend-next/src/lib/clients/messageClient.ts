import { api } from "@/lib/api";
import type { Message } from "@/types";

/** Messages & saved/starred — maps to `backend/routes/message.routes.js`. */
export function listSavedMessages() {
  return api.get<Message[]>("/message/saved");
}
