"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import {
  draftKey,
  firstHttpUrl,
  notifyDraftChange,
  readStoredDraft,
} from "@/lib/chatCompose";

export function useChatDraftAndPreview({ cid, text, setText }) {
  const [linkPreview, setLinkPreview] = useState(null);
  const linkPreviewTimerRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined" || !cid) return;
    try {
      const d = readStoredDraft(cid);
      if (d.text) setText(d.text);
    } catch {}
  }, [cid, setText]);

  useEffect(() => {
    if (typeof window === "undefined" || !cid) return;
    const tmr = setTimeout(() => {
      try {
        if (text) {
          localStorage.setItem(
            draftKey(cid),
            JSON.stringify({
              text,
              updatedAt: Date.now(),
            }),
          );
        } else {
          localStorage.removeItem(draftKey(cid));
        }
        notifyDraftChange(cid);
      } catch {}
    }, 400);
    return () => clearTimeout(tmr);
  }, [text, cid]);

  useEffect(() => {
    setLinkPreview(null);
    if (linkPreviewTimerRef.current) {
      clearTimeout(linkPreviewTimerRef.current);
    }
    const url = firstHttpUrl(text);
    if (!url || !/^https:/i.test(url)) return;
    linkPreviewTimerRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get("/utility/link-preview", {
          params: { url },
        });
        setLinkPreview(data);
      } catch {
        setLinkPreview(null);
      }
    }, 600);
    return () => {
      if (linkPreviewTimerRef.current) {
        clearTimeout(linkPreviewTimerRef.current);
      }
    };
  }, [text]);

  return { linkPreview };
}
