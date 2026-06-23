"use client";

import { useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useAppSelector } from "@/store/hooks";
import {
  formatDocumentTitle,
  resolvePageTitleSegment,
  syncThemeFavicon,
} from "@/lib/documentHead";

export default function DocumentHeadSync() {
  const pathname = usePathname();
  const { t, i18n } = useTranslation();
  const theme = useAppSelector((s) => s.ui.theme);
  const conversations = useAppSelector((s) => s.chat.conversations);
  const myUserId = useAppSelector((s) => s.auth.user?._id);

  const conversationId = useMemo(() => {
    const match = pathname?.match(/^\/chat\/([^/]+)/);
    return match?.[1] || null;
  }, [pathname]);

  const conversation = useMemo(() => {
    if (!conversationId) return undefined;
    return conversations.find((c) => String(c._id) === String(conversationId));
  }, [conversationId, conversations]);

  useEffect(() => {
    syncThemeFavicon(theme === "dark");
  }, [theme]);

  useEffect(() => {
    const applyFromDom = () => {
      syncThemeFavicon(document.documentElement.classList.contains("dark"));
    };
    applyFromDom();
    const observer = new MutationObserver(applyFromDom);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const segment = resolvePageTitleSegment(pathname || "/", t, {
      conversation,
      myUserId: myUserId ? String(myUserId) : undefined,
    });
    document.title = formatDocumentTitle(segment);
  }, [pathname, t, i18n.language, conversation, myUserId]);

  return null;
}
