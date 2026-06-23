import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { allShellHrefs } from "@/lib/shellWiring";

const SHELL_HREFS = allShellHrefs();
const prefetched = new Set<string>();

/** Warm Next.js route chunks for all shell tabs (idempotent). */
export function prefetchShellRoutes(router: AppRouterInstance) {
  for (const href of SHELL_HREFS) {
    if (prefetched.has(href)) continue;
    prefetched.add(href);
    try {
      router.prefetch(href);
    } catch {
      prefetched.delete(href);
    }
  }
}
