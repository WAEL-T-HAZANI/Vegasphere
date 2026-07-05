"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  startIncomingCallRingtone,
  stopIncomingCallRingtone,
} from "@/lib/callRingtone";
import {
  chatIdFromPathname,
  rememberChatBackFrom,
  resolveCallTargets,
  resolveMemberDisplayName,
  stripCallSearchParams,
} from "@/lib/callContext";
import { setSidebarOpen } from "@/store/slices/uiSlice";
import { callsClient } from "@/lib/clients";
import { getSocket } from "@/lib/socket";
import { prefetchJitsiExternalApi } from "@/lib/jitsiConfig";
import { useJitsiCall } from "@/components/calls/hooks/useJitsiCall";
import JitsiCallScreen from "@/components/calls/JitsiCallScreen";

export default function CallManagerProvider() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const notificationPrefs = useAppSelector((s) => s.ui.notificationPrefs);
  const conversations = useAppSelector((s) => s.chat.conversations);
  const socketReady = useAppSelector((s) => s.chat.socketReady);
  const myUserId = user?._id ? String(user._id) : "";
  const userDnd = Boolean(user?.doNotDisturb);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const autocallStartedRef = useRef(false);
  const prevCallActiveRef = useRef(false);

  const chatId = chatIdFromPathname(pathname);
  const activeConv = useMemo(
    () =>
      (conversations || []).find(
        (conv) => String(conv._id) === String(chatId),
      ) || null,
    [conversations, chatId],
  );

  const targets = useMemo(
    () => (activeConv && myUserId ? resolveCallTargets(activeConv, myUserId) : null),
    [activeConv, myUserId],
  );

  const call = useJitsiCall(myUserId, user?.name || "", user?.email || "");
  const callRef = useRef(call);
  callRef.current = call;

  const mode = searchParams.get("autocall");
  const incomingCallParam = searchParams.get("incomingCall");
  const wantsAutocall = mode === "audio" || mode === "video";
  const fromParam = searchParams.get("from");

  useEffect(() => {
    if (fromParam) rememberChatBackFrom(fromParam);
  }, [fromParam]);

  useEffect(() => {
    const ringingIn = call.callState === "ringing_in";
    const ringingOut = call.callState === "ringing_out";
    const allowSound =
      notificationPrefs?.callIncoming !== false &&
      !Boolean(notificationPrefs?.doNotDisturb || userDnd);

    if ((ringingIn || ringingOut) && allowSound) {
      startIncomingCallRingtone();
    } else {
      stopIncomingCallRingtone();
    }
  }, [
    call.callState,
    notificationPrefs?.callIncoming,
    notificationPrefs?.doNotDisturb,
    userDnd,
  ]);

  useEffect(() => () => stopIncomingCallRingtone(), []);

  useEffect(() => {
    if (!myUserId) return;
    prefetchJitsiExternalApi();
  }, [myUserId]);

  useEffect(() => {
    if (call.callState === "idle") return;
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(max-width: 767px)").matches) return;
    dispatch(setSidebarOpen(false));
  }, [call.callState, dispatch]);

  useEffect(() => {
    if (!wantsAutocall || !chatId) {
      autocallStartedRef.current = false;
    }
  }, [wantsAutocall, chatId, mode]);

  useEffect(() => {
    if (incomingCallParam !== "1" || !chatId) return;
    const socket = getSocket();
    if (!socket) return;
    socket.auth = {
      ...(socket.auth || {}),
      token:
        typeof window !== "undefined"
          ? localStorage.getItem("token") || ""
          : "",
    };
    if (!socket.connected) socket.connect();
    socket.emit("setup");
  }, [incomingCallParam, chatId]);

  useEffect(() => {
    if (autocallStartedRef.current) return;
    if (!myUserId || !chatId || !wantsAutocall || !targets) return;
    if (!socketReady) return;
    const socket = getSocket();
    if (!socket?.connected) return;
    if (callRef.current.callState !== "idle") return;

    const peerUserId = targets.peerUserId;

    void (async () => {
      if (peerUserId) {
        try {
          const { data } = await callsClient.canRingUser(peerUserId);
          if (!data?.allowed) {
            const params = stripCallSearchParams(searchParams, { stripFrom: true });
            const qs = params.toString();
            router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
            return;
          }
        } catch {
          return;
        }
      }

      if (autocallStartedRef.current) return;
      autocallStartedRef.current = true;
      const wantVideo = mode === "video";

      if (targets.isGroup && targets.groupPeerIds.length > 0) {
        callRef.current.startOutgoing(
          targets.groupPeerIds,
          wantVideo,
          chatId,
          true,
        );
        return;
      }

      if (targets.peerUserId) {
        callRef.current.startOutgoing(
          targets.peerUserId,
          wantVideo,
          chatId,
          false,
        );
      }
    })();
  }, [
    myUserId,
    chatId,
    wantsAutocall,
    mode,
    targets,
    pathname,
    router,
    searchParams,
    socketReady,
  ]);

  useEffect(() => {
    const anyActive = call.callState !== "idle";

    if (
      prevCallActiveRef.current &&
      !anyActive &&
      (searchParams.has("autocall") ||
        searchParams.has("incomingCall") ||
        searchParams.has("invite") ||
        searchParams.has("from"))
    ) {
      if (searchParams.get("from")) {
        rememberChatBackFrom(searchParams.get("from"));
      }
      const params = stripCallSearchParams(searchParams, { stripFrom: true });
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
      autocallStartedRef.current = false;
    }

    prevCallActiveRef.current = anyActive;
  }, [call.callState, pathname, router, searchParams]);

  const peerDisplayName = useMemo(() => {
    if (call.incomingMeta?.from) {
      return resolveMemberDisplayName(
        call.incomingMeta.from,
        conversations,
        t("someoneTypingAnonymous"),
      );
    }
    if (call.isGroupCall && activeConv) {
      return activeConv.name || t("navGroups");
    }
    if (targets?.peerDisplayName) {
      return targets.peerDisplayName;
    }
    if (activeConv && !activeConv.isGroup) {
      return (
        resolveMemberDisplayName(
          targets?.peerUserId,
          conversations,
          activeConv.name || activeConv.chatName || t("someoneTypingAnonymous"),
        ) || t("someoneTypingAnonymous")
      );
    }
    return t("someoneTypingAnonymous");
  }, [
    activeConv,
    call.incomingMeta,
    call.isGroupCall,
    conversations,
    targets,
    t,
  ]);

  if (!myUserId) return null;
  if (call.callState === "idle") return null;

  return (
    <JitsiCallScreen
      open
      callState={call.callState}
      peerDisplayName={peerDisplayName}
      isVideoCall={call.isVideoCall}
      isGroupCall={call.isGroupCall}
      roomName={call.roomName}
      callElapsedSec={call.callElapsedSec}
      callNotice={call.callNotice}
      jitsiActive={call.jitsiActive}
      acceptingIncoming={call.acceptingIncoming}
      userDisplayName={call.userDisplayName}
      userEmail={call.userEmail}
      onAcceptIncoming={call.acceptIncoming}
      onRejectIncoming={call.rejectIncoming}
      onHangup={call.hangup}
      onJitsiReadyToClose={call.onJitsiReadyToClose}
    />
  );
}
