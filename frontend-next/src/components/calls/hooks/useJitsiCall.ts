// @ts-nocheck
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppSelector } from "@/store/hooks";
import {
  emitJitsiSignal,
  useJitsiSignaling,
} from "@/components/calls/hooks/useJitsiSignaling";
import { stopIncomingCallRingtone } from "@/lib/callRingtone";
import {
  INCOMING_RING_TIMEOUT_MS,
  OUTGOING_RING_TIMEOUT_MS,
} from "@/lib/jitsiCallConstants";
import { callsClient } from "@/lib/clients";
import { showAppToast } from "@/lib/appToast";

function createCallSessionId(prefix = "jitsi") {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function callNoticeMessage(notice, t) {
  switch (notice) {
    case "busy":
      return t("callBusyRemote");
    case "declined":
      return t("callDeclinedRemote");
    case "missed":
      return t("callMissedRemote");
    case "no-answer":
      return t("callNoAnswer");
    case "failed":
      return t("callMediaFailed");
    default:
      return "";
  }
}

export function useJitsiCall(myUserId, userDisplayName = "", userEmail = "") {
  const { t } = useTranslation();
  const notificationPrefs = useAppSelector((s) => s.ui.notificationPrefs);
  const userDnd = useAppSelector((s) => s.auth.user?.doNotDisturb);

  const [callState, setCallState] = useState("idle");
  const [incomingMeta, setIncomingMeta] = useState(null);
  const [isVideoCall, setIsVideoCall] = useState(false);
  const [isGroupCall, setIsGroupCall] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [callElapsedSec, setCallElapsedSec] = useState(0);
  const [callNotice, setCallNotice] = useState("");
  const [jitsiActive, setJitsiActive] = useState(false);
  const [acceptingIncoming, setAcceptingIncoming] = useState(false);

  const convIdRef = useRef(null);
  const callSessionIdRef = useRef(null);
  const remotePeerRef = useRef(null);
  const ringTargetsRef = useRef([]);
  const callStateRef = useRef(callState);
  const ringTimeoutRef = useRef(null);
  const callActiveSinceRef = useRef(null);
  const signalHandlerRef = useRef(() => {});
  const alertedSessionsRef = useRef(new Set());
  const endingRef = useRef(false);
  const hangupRef = useRef(() => {});

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  const toastNotice = useCallback(
    (notice) => {
      const body = callNoticeMessage(notice, t);
      if (!body) return;
      showAppToast({
        id: `call-notice-${notice}-${Date.now()}`,
        body,
      });
    },
    [t],
  );

  const resetCall = useCallback((options = {}) => {
    const preserveNotice = options?.preserveNotice === true;
    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }
    convIdRef.current = null;
    callSessionIdRef.current = null;
    remotePeerRef.current = null;
    ringTargetsRef.current = [];
    endingRef.current = false;
    setAcceptingIncoming(false);
    setRoomName("");
    setJitsiActive(false);
    setCallState("idle");
    setIncomingMeta(null);
    setIsVideoCall(false);
    setIsGroupCall(false);
    callActiveSinceRef.current = null;
    setCallElapsedSec(0);
    if (!preserveNotice) setCallNotice("");
  }, []);

  const resolveRoom = useCallback(async (conversationId, _groupCall) => {
    const { data } = await callsClient.getJitsiRoom(conversationId);
    if (!data?.roomName) throw new Error("Could not resolve call room");
    setRoomName(data.roomName);
    return data.roomName;
  }, []);

  const matchesSession = useCallback((payload) => {
    const incoming = String(payload?.callSessionId || "");
    const current = String(callSessionIdRef.current || "");
    if (!incoming || !current) return true;
    return incoming === current;
  }, []);

  const signalTargets = useCallback(() => {
    if (ringTargetsRef.current?.length > 0) return ringTargetsRef.current;
    if (remotePeerRef.current) return [remotePeerRef.current];
    return [];
  }, []);

  const emitEndedToTargets = useCallback(async () => {
    if (!myUserId) return;
    for (const to of signalTargets()) {
      await emitJitsiSignal({
        to,
        from: myUserId,
        type: "call-ended",
        conversationId: convIdRef.current,
        callSessionId: callSessionIdRef.current,
      });
    }
  }, [myUserId, signalTargets]);

  const finishCall = useCallback(
    (notice = "", options = {}) => {
      if (endingRef.current && !options?.force) return;
      endingRef.current = true;
      stopIncomingCallRingtone();
      if (notice) {
        toastNotice(notice);
        setCallNotice(notice);
      }
      resetCall({ preserveNotice: Boolean(notice) });
    },
    [resetCall, toastNotice],
  );

  const beginJitsi = useCallback(() => {
    stopIncomingCallRingtone();
    setAcceptingIncoming(false);
    setJitsiActive(true);
    setCallState("active");
    setIncomingMeta(null);
    callActiveSinceRef.current = Date.now();
    setCallElapsedSec(0);
  }, []);

  const startOutgoing = useCallback(
    async (targets, wantVideo, conversationId, groupCall = false) => {
      if (!myUserId || !conversationId) return;
      const peerIds = Array.isArray(targets)
        ? targets.filter(Boolean).map(String)
        : targets
          ? [String(targets)]
          : [];
      if (!peerIds.length) return;

      resetCall();
      convIdRef.current = conversationId;
      callSessionIdRef.current = createCallSessionId("jitsi-call");
      setIsVideoCall(Boolean(wantVideo));
      setIsGroupCall(Boolean(groupCall));
      ringTargetsRef.current = peerIds;
      remotePeerRef.current = groupCall ? null : peerIds[0];

      try {
        const resolvedRoom = await resolveRoom(conversationId, groupCall);
        setRoomName(resolvedRoom);
        // Caller joins the room while ringing so they become moderator before the callee.
        setJitsiActive(true);
        setCallState("ringing_out");
        setCallNotice("");

        for (const to of peerIds) {
          const sent = await emitJitsiSignal({
            to,
            from: myUserId,
            type: "call-user",
            conversationId,
            callSessionId: callSessionIdRef.current,
            callType: wantVideo ? "video" : "audio",
            roomName: resolvedRoom,
            groupCall: Boolean(groupCall),
          });
          if (!sent) throw new Error("Socket not connected");
        }
      } catch (e) {
        console.warn("Jitsi startOutgoing:", e);
        finishCall("failed", { force: true });
      }
    },
    [finishCall, myUserId, resetCall, resolveRoom],
  );

  const acceptIncoming = useCallback(async () => {
    if (acceptingIncoming || !incomingMeta || !myUserId) return;
    setAcceptingIncoming(true);
    stopIncomingCallRingtone();

    const { from, roomName: incomingRoom, callType } = incomingMeta;
    setIsVideoCall((callType || "audio") === "video");

    let resolvedRoom = incomingRoom || "";
    if (!resolvedRoom && convIdRef.current) {
      try {
        resolvedRoom = await resolveRoom(convIdRef.current, isGroupCall);
      } catch (e) {
        console.warn("Jitsi resolve room on accept:", e);
        setAcceptingIncoming(false);
        finishCall("failed", { force: true });
        return;
      }
    }
    if (resolvedRoom) setRoomName(resolvedRoom);

    const sent = await emitJitsiSignal({
      to: from,
      from: myUserId,
      type: "call-accepted",
      conversationId: convIdRef.current,
      callSessionId: callSessionIdRef.current,
      roomName: resolvedRoom,
      callType: callType || "audio",
    });

    if (!sent) {
      setAcceptingIncoming(false);
      finishCall("failed", { force: true });
      return;
    }

    // Brief delay so the caller (already in the room) is moderator before we join.
    await new Promise((resolve) => setTimeout(resolve, 1500));
    if (!callSessionIdRef.current) {
      setAcceptingIncoming(false);
      return;
    }

    beginJitsi();
  }, [
    acceptingIncoming,
    beginJitsi,
    finishCall,
    incomingMeta,
    isGroupCall,
    myUserId,
    resolveRoom,
  ]);

  const rejectIncoming = useCallback(() => {
    stopIncomingCallRingtone();
    if (incomingMeta?.from && myUserId) {
      void emitJitsiSignal({
        to: incomingMeta.from,
        from: myUserId,
        type: "call-rejected",
        conversationId: convIdRef.current,
        callSessionId: callSessionIdRef.current,
      });
    }
    finishCall("declined", { force: true });
  }, [finishCall, incomingMeta, myUserId]);

  const hangup = useCallback(() => {
    if (endingRef.current) return;
    endingRef.current = true;
    stopIncomingCallRingtone();
    void emitEndedToTargets().finally(() => {
      resetCall();
    });
  }, [emitEndedToTargets, resetCall]);

  useEffect(() => {
    hangupRef.current = hangup;
  }, [hangup]);

  const handleSignal = useCallback(
    async (payload) => {
      if (!payload || !myUserId) return;
      const {
        type,
        from,
        to,
        roomName: payloadRoom,
        callType,
        groupCall,
      } = payload;
      if (String(to) !== String(myUserId)) return;

      if (type === "call-user") {
        if (callStateRef.current !== "idle") {
          void emitJitsiSignal({
            to: from,
            from: myUserId,
            type: "call-busy",
            conversationId: payload.conversationId || null,
            callSessionId: payload.callSessionId,
          });
          return;
        }

        convIdRef.current = payload.conversationId || null;
        callSessionIdRef.current =
          payload.callSessionId || createCallSessionId("jitsi-call");
        remotePeerRef.current = String(from);
        setIsGroupCall(Boolean(groupCall));
        setIsVideoCall((callType || "audio") === "video");
        if (payloadRoom) setRoomName(payloadRoom);
        setIncomingMeta({
          from,
          roomName: payloadRoom || "",
          callType: callType || "audio",
        });
        setCallState("ringing_in");
        setCallNotice("");

        const alertKey = String(callSessionIdRef.current || "");
        if (
          alertKey &&
          typeof document !== "undefined" &&
          document.hidden &&
          notificationPrefs?.callIncoming !== false &&
          !Boolean(notificationPrefs?.doNotDisturb || userDnd) &&
          typeof Notification !== "undefined" &&
          Notification.permission === "granted" &&
          !alertedSessionsRef.current.has(alertKey)
        ) {
          alertedSessionsRef.current.add(alertKey);
          try {
            new Notification("Vegasphere", {
              body:
                (callType || "audio") === "video"
                  ? "Incoming video call"
                  : "Incoming voice call",
              tag: alertKey,
            });
          } catch {}
        }
        return;
      }

      if (!matchesSession(payload)) return;

      if (type === "call-accepted") {
        if (payloadRoom) setRoomName(payloadRoom);
        beginJitsi();
        return;
      }

      if (type === "call-rejected") {
        finishCall("declined", { force: true });
        return;
      }

      if (type === "call-ended") {
        const notice =
          callStateRef.current === "ringing_out"
            ? "no-answer"
            : callStateRef.current === "ringing_in"
              ? "missed"
              : "";
        finishCall(notice, { force: true });
        return;
      }

      if (type === "call-busy") {
        finishCall("busy", { force: true });
      }
    },
    [
      beginJitsi,
      finishCall,
      matchesSession,
      myUserId,
      notificationPrefs,
      userDnd,
    ],
  );

  useEffect(() => {
    signalHandlerRef.current = handleSignal;
  }, [handleSignal]);

  useJitsiSignaling(useCallback((p) => signalHandlerRef.current(p), []));

  useEffect(() => {
    if (callState !== "ringing_out" && callState !== "ringing_in") {
      if (ringTimeoutRef.current) {
        clearTimeout(ringTimeoutRef.current);
        ringTimeoutRef.current = null;
      }
      return;
    }

    const delay =
      callState === "ringing_out"
        ? OUTGOING_RING_TIMEOUT_MS
        : INCOMING_RING_TIMEOUT_MS;

    ringTimeoutRef.current = setTimeout(() => {
      ringTimeoutRef.current = null;
      if (callStateRef.current === "ringing_out") {
        void emitEndedToTargets().finally(() => {
          finishCall("no-answer", { force: true });
        });
        return;
      }
      if (callStateRef.current === "ringing_in") {
        const callerId = remotePeerRef.current;
        if (callerId && myUserId) {
          void emitJitsiSignal({
            to: callerId,
            from: myUserId,
            type: "call-rejected",
            conversationId: convIdRef.current,
            callSessionId: callSessionIdRef.current,
          });
        }
        finishCall("missed", { force: true });
      }
    }, delay);

    return () => {
      if (ringTimeoutRef.current) {
        clearTimeout(ringTimeoutRef.current);
        ringTimeoutRef.current = null;
      }
    };
  }, [callState, emitEndedToTargets, finishCall, myUserId]);

  useEffect(() => {
    if (callState !== "active") {
      callActiveSinceRef.current = null;
      setCallElapsedSec(0);
      return;
    }
    if (!callActiveSinceRef.current) {
      callActiveSinceRef.current = Date.now();
    }
    const id = setInterval(() => {
      const start = callActiveSinceRef.current;
      if (!start) return;
      setCallElapsedSec(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [callState]);

  const onJitsiReadyToClose = useCallback(() => {
    hangupRef.current?.();
  }, []);

  return {
    callState,
    incomingMeta,
    isVideoCall,
    isGroupCall,
    roomName,
    callElapsedSec,
    callNotice,
    jitsiActive,
    acceptingIncoming,
    userDisplayName,
    userEmail,
    startOutgoing,
    acceptIncoming,
    rejectIncoming,
    hangup,
    onJitsiReadyToClose,
  };
}
