import type { AxiosRequestConfig } from "axios";
import { api } from "@/lib/api";

/** Local AI services — maps to `backend/routes/ai.routes.js`. */
export function translateText(body: Record<string, unknown>) {
  return api.post("/ai/translate", body);
}

export function getSmartReplies(
  body: Record<string, unknown>,
  config?: AxiosRequestConfig,
) {
  return api.post("/ai/smart-replies", body, config);
}

export function listTranslateLanguages<T = { languages?: Array<{ code: string; name: string }> }>() {
  return api.get<T>("/ai/translate/languages");
}
