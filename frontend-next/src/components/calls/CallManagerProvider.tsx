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
import { useWebRtcCall } from "@/components/calls/hooks/useWebRtcCall";
import { useWebRtcGroupMesh } from "@/components/calls/hooks/useWebRtcGroupMesh";
import CallScreenOverlay from "@/components/calls/CallScreenOverlay";
import GroupCallScreenOverlay from "@/components/calls/GroupCallScreenOverlay";

export default function CallManagerProvider() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const notificationPrefs = useAppSelector((s) => s.ui.notificationPrefs);
  const conversations = useAppSelector((s) => s.chat.conversations);
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

  const dmCall = useWebRtcCall(myUserId);
  const groupCall = useWebRtcGroupMesh(myUserId, null);

  const dmCallRef = useRef(dmCall);
  const groupCallRef = useRef(groupCall);
  dmCallRef.current = dmCall;
  groupCallRef.current = groupCall;

  const mode = searchParams.get("autocall");
  const wantsAutocall = mode === "audio" || mode === "video";
  const fromParam = searchParams.get("from");

  useEffect(() => {
    if (fromParam) rememberChatBackFrom(fromParam);
  }, [fromParam]);

  useEffect(() => {
    const ringingIn =
      dmCall.callState === "ringing_in" ||
      groupCall.callState === "ringing_in";
    const ringingOut =
      dmCall.callState === "ringing_out" ||
      groupCall.callState === "ringing_out";
    const allowSound =
      notificationPrefs?.callIncoming !== false &&
      !Boolean(notificationPrefs?.doNotDisturb || userDnd);

    if ((ringingIn || ringingOut) && allowSound) {
      startIncomingCallRingtone();
    } else {
      stopIncomingCallRingtone();
    }
  }, [
    dmCall.callState,
    groupCall.callState,
    notificationPrefs?.callIncoming,
    notificationPrefs?.doNotDisturb,
    userDnd,
  ]);

  useEffect(() => () => stopIncomingCallRingtone(), []);

  useEffect(() => {
    const anyActive =
      dmCall.callState !== "idle" || groupCall.callState !== "idle";
    if (!anyActive) return;
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(max-width: 767px)").matches) return;
    dispatch(setSidebarOpen(false));
  }, [dmCall.callState, groupCall.callState, dispatch]);

  useEffect(() => {
    if (!wantsAutocall || !chatId) {
      autocallStartedRef.current = false;
    }
  }, [wantsAutocall, chatId, mode]);

  useEffect(() => {
    if (autocallStartedRef.current) return;
    if (!myUserId || !chatId || !wantsAutocall || !targets) return;
    if (dmCallRef.current.callState !== "idle") return;
    if (groupCallRef.current.callState !== "idle") return;

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
        groupCallRef.current.startGroupCall(targets.groupPeerIds, wantVideo, chatId);
        return;
      }

      if (targets.peerUserId) {
        dmCallRef.current.startOutgoing(targets.peerUserId, wantVideo, chatId);
      }
    })();
  }, [myUserId, chatId, wantsAutocall, mode, targets, pathname, router, searchParams]);

  useEffect(() => {
    const anyActive =
      dmCall.callState !== "idle" || groupCall.callState !== "idle";

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
  }, [
    dmCall.callState,
    groupCall.callState,
    pathname,
    router,
    searchParams,
  ]);

  const dmPeerName = useMemo(() => {
    if (dmCall.incomingMeta?.from) {
      return resolveMemberDisplayName(
        dmCall.incomingMeta.from,
        conversations,
        t("someoneTypingAnonymous"),
      );
    }
    return targets?.peerDisplayName || t("someoneTypingAnonymous");
  }, [conversations, dmCall.incomingMeta, targets, t]);

  const groupParticipantLabels = useMemo(() => {
    const labels = { ...(targets?.participantLabels || {}) };
    if (groupCall.incomingMeta?.from) {
      const callerId = String(groupCall.incomingMeta.from);
      if (!labels[callerId]) {
        labels[callerId] = resolveMemberDisplayName(
          callerId,
          conversations,
          callerId,
        );
      }
    }
    return labels;
  }, [conversations, groupCall.incomingMeta, targets]);

  const groupCallerName = useMemo(() => {
    if (!groupCall.incomingMeta?.from) {
      return t("someoneTypingAnonymous");
    }
    return resolveMemberDisplayName(
      groupCall.incomingMeta.from,
      conversations,
      t("someoneTypingAnonymous"),
    );
  }, [conversations, groupCall.incomingMeta, t]);

  if (!myUserId) return null;

  const showGroup = groupCall.callState !== "idle";
  const showDm = !showGroup && dmCall.callState !== "idle";

  return (
    <>
      {showDm ? (
        <CallScreenOverlay
          open
          callState={dmCall.callState}
          peerConnectionState={dmCall.peerConnectionState}
          peerDisplayName={dmPeerName}
          isVideoCall={dmCall.isVideoCall}
          localStream={dmCall.localStream}
          remoteStream={dmCall.remoteStream}
          micMuted={dmCall.micMuted}
          camOff={dmCall.camOff}
          callElapsedSec={dmCall.callElapsedSec}
          onToggleMic={dmCall.toggleMic}
          onToggleCamera={dmCall.toggleCamera}
          onHangup={dmCall.hangup}
          onToggleScreenShare={dmCall.toggleScreenShare}
          isScreenSharing={dmCall.isScreenSharing}
          iceRestartPending={dmCall.iceRestartPending}
          callNotice={dmCall.callNotice}
          audioInputs={dmCall.audioInputs}
          videoInputs={dmCall.videoInputs}
          audioOutputs={dmCall.audioOutputs}
          selectedAudioInputId={dmCall.selectedAudioInputId}
          selectedVideoInputId={dmCall.selectedVideoInputId}
          selectedAudioOutputId={dmCall.selectedAudioOutputId}
          onChangeAudioInput={(audioInputId) =>
            dmCall.switchInputDevice({ audioInputId })
          }
          onChangeVideoInput={(videoInputId) =>
            dmCall.switchInputDevice({ videoInputId })
          }
          onChangeAudioOutput={(audioOutputId) =>
            dmCall.setSelectedAudioOutputId(audioOutputId)
          }
          onAcceptIncoming={dmCall.acceptIncoming}
          onRejectIncoming={dmCall.rejectIncoming}
        />
      ) : null}

      {showGroup ? (
        <GroupCallScreenOverlay
          open
          callState={groupCall.callState}
          participantLabels={groupParticipantLabels}
          callerDisplayName={groupCallerName}
          isVideoCall={groupCall.isVideoCall}
          localStream={groupCall.localStream}
          remoteStreams={groupCall.remoteStreams}
          micMuted={groupCall.micMuted}
          camOff={groupCall.camOff}
          callElapsedSec={groupCall.callElapsedSec}
          onToggleMic={groupCall.toggleMic}
          onToggleCamera={groupCall.toggleCamera}
          onHangup={groupCall.hangup}
          onToggleScreenShare={groupCall.toggleScreenShare}
          isScreenSharing={groupCall.isScreenSharing}
          audioInputs={groupCall.audioInputs}
          videoInputs={groupCall.videoInputs}
          audioOutputs={groupCall.audioOutputs}
          selectedAudioInputId={groupCall.selectedAudioInputId}
          selectedVideoInputId={groupCall.selectedVideoInputId}
          selectedAudioOutputId={groupCall.selectedAudioOutputId}
          onChangeAudioInput={(audioInputId) =>
            groupCall.switchInputDevice({ audioInputId })
          }
          onChangeVideoInput={(videoInputId) =>
            groupCall.switchInputDevice({ videoInputId })
          }
          onChangeAudioOutput={(audioOutputId) =>
            groupCall.setSelectedAudioOutputId(audioOutputId)
          }
          onAcceptIncoming={groupCall.acceptIncoming}
          onRejectIncoming={groupCall.rejectIncoming}
        />
      ) : null}
    </>
  );
}
