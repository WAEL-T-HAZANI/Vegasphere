"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  ensureE2eKeypair,
  getPublicKeyBase64,
  wrapConversationKeyForUser,
  unwrapConversationKey,
  getStoredConversationKey,
  storeConversationKey,
  generateConversationKey,
} from "@/lib/e2eClient";
import { setConversations } from "@/store/slices/chatSlice";
import { useTranslation } from "react-i18next";
import { formatApiError } from "@/lib/apiError";
import { showAppToast } from "@/lib/appToast";

export function useChatE2e({
  dmE2eActive,
  userId,
  cid,
  activeConv,
  peerUserId,
  peerMember,
  canEnableE2e,
  dispatch,
}) {
  const { t } = useTranslation();
  const [e2eConvKey, setE2eConvKey] = useState(null);
  const [, setE2eBusy] = useState(false);

  useEffect(() => {
    if (!dmE2eActive || !userId) {
      setE2eConvKey(null);
      return;
    }
    const stored = getStoredConversationKey(cid);
    if (stored) {
      setE2eConvKey(stored);
      return;
    }
    const wrap = activeConv?.e2eWrappedKeys?.find(
      (w) => String(w.userId) === String(userId),
    );
    const issuerPk = activeConv?.e2eIssuerPublicKey;
    if (!wrap?.box || !issuerPk) {
      setE2eConvKey(null);
      return;
    }
    try {
      const pair = ensureE2eKeypair(userId);
      if (!pair) return;
      const raw = unwrapConversationKey(
        issuerPk,
        wrap.box,
        wrap.nonce,
        pair.secretKey,
      );
      storeConversationKey(cid, raw);
      setE2eConvKey(raw);
    } catch {
      setE2eConvKey(null);
    }
  }, [
    dmE2eActive,
    userId,
    cid,
    activeConv?.e2eWrappedKeys,
    activeConv?.e2eIssuerPublicKey,
  ]);

  const enableE2e = async () => {
    if (!userId || !canEnableE2e || !peerMember?.e2ePublicKey) return;
    setE2eBusy(true);
    try {
      ensureE2eKeypair(userId);
      const pub = getPublicKeyBase64(userId);
      await api.put("/user/e2e-public-key", { publicKey: pub });
      const pair = ensureE2eKeypair(userId);
      if (!pair) return;
      const convKey = generateConversationKey();
      const wrappedKeys = [
        {
          userId,
          ...wrapConversationKeyForUser(pub, convKey, pair.secretKey),
        },
        {
          userId: peerUserId,
          ...wrapConversationKeyForUser(
            peerMember.e2ePublicKey,
            convKey,
            pair.secretKey,
          ),
        },
      ];
      await api.post(`/conversation/${cid}/e2e-enable`, { wrappedKeys });
      storeConversationKey(cid, convKey);
      setE2eConvKey(convKey);
      const { data } = await api.get("/conversation/");
      dispatch(setConversations(data || []));
    } catch (e) {
      showAppToast({
        id: `e2e-fail-${Date.now()}`,
        conversationId: cid,
        body: formatApiError(e, t, "errorOccurred"),
      });
    } finally {
      setE2eBusy(false);
    }
  };

  return { e2eConvKey, setE2eConvKey, enableE2e };
}
