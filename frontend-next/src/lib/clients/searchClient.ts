import { api } from "@/lib/api";
import type { GlobalSearchResult } from "@/lib/searchHub";

/** Global search — maps to `backend/routes/search.routes.js`. */
export function globalSearch(query: string) {
  return api.get<GlobalSearchResult>("/search", {
    params: { q: query },
  });
}
