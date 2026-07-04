// @ts-nocheck
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAppSelector } from "@/store/hooks";

import {
  emitWebRtcSignal,
  useWebRtcSignaling,
} from "@/components/calls/hooks/useWebRtcSignaling";
import { getRtcConfiguration } from "@/lib/webrtcRtcConfig";
import { applyOutboundRtpCaps } from "@/lib/webrtcSendCaps";
import { useCallDevicePreferences } from "@/components/calls/hooks/useCallDevicePreferences";
import { stopIncomingCallRingtone } from "@/lib/callRingtone";
import {
  acquireCallMedia,
  attachLocalStreamToPeer,
  IceCandidateQueue,
  mergeRemoteTrack,
  applyIceCandidate,
  buildCallMediaConstraints,
} from "@/lib/webrtcCallMedia";

function createCallSessionId(prefix = "call") {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useWebRtcCall(myUserId) {
  const notificationPrefs = useAppSelector((s) => s.ui.notificationPrefs);
  const userDnd = useAppSelector((s) => s.auth.user?.doNotDisturb);
  const {
    audioInputs,
    videoInputs,
    audioOutputs,
    selectedAudioInputId,
    selectedVideoInputId,
    selectedAudioOutputId,
    setSelectedAudioInputId,
    setSelectedVideoInputId,
    setSelectedAudioOutputId,
    refreshDevices,
  } = useCallDevicePreferences();
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callState, setCallState] = useState("idle");
  const [incomingMeta, setIncomingMeta] = useState(null);
  const [isVideoCall, setIsVideoCall] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [callElapsedSec, setCallElapsedSec] = useState(0);
  const [peerConnectionState, setPeerConnectionState] = useState(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [iceRestartPending, setIceRestartPending] = useState(false);
  const [callNotice, setCallNotice] = useState("");

  const pcRef = useRef(null);
  const callActiveSinceRef = useRef(null);
  const remotePeerRef = useRef(null);
  const iceQueueRef = useRef(new IceCandidateQueue());
  const convIdRef = useRef(null);
  const callSessionIdRef = useRef(null);
  const signalHandlerRef = useRef(() => {});

  const localStreamRef = useRef(null);
  const callStateRef = useRef(callState);
  const isVideoCallRef = useRef(isVideoCall);
  const screenStreamRef = useRef(null);
  const cameraVideoTrackRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectingRef = useRef(false);
  const disconnectTimerRef = useRef(null);
  const alertedSessionsRef = useRef(new Set());

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);
  useEffect(() => {
    isVideoCallRef.current = isVideoCall;
  }, [isVideoCall]);

  const emit = useCallback((payload) => {
    emitWebRtcSignal({
      ...payload,
      conversationId: convIdRef.current ?? payload.conversationId,
      callSessionId: callSessionIdRef.current ?? payload.callSessionId,
    });
  }, []);

  const tryIceRestartRef = useRef(async () => {});

  const closePeer = useCallback((options = {}) => {
    const preserveNotice = options?.preserveNotice === true;
    if (disconnectTimerRef.current) {
      clearTimeout(disconnectTimerRef.current);
      disconnectTimerRef.current = null;
    }
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    cameraVideoTrackRef.current = null;
    setIsScreenSharing(false);
    reconnectAttemptsRef.current = 0;
    reconnectingRef.current = false;
    setIceRestartPending(false);

    iceQueueRef.current.clear();
    setPeerConnectionState(null);
    pcRef.current?.close();
    pcRef.current = null;
    setLocalStream((s) => {
      s?.getTracks().forEach((t) => t.stop());
      return null;
    });
    setRemoteStream(null);
    remotePeerRef.current = null;
    convIdRef.current = null;
    callSessionIdRef.current = null;
    setCallState("idle");
    setIncomingMeta(null);
    setIsVideoCall(false);
    setMicMuted(false);
    setCamOff(false);
    callActiveSinceRef.current = null;
    setCallElapsedSec(0);
    if (!preserveNotice) {
      setCallNotice("");
    }
  }, []);

  const flushIce = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc?.remoteDescription) return;
    await iceQueueRef.current.flush(pc);
  }, []);

  const addIce = useCallback(async (candidate) => {
    const pc = pcRef.current;
    const ready = iceQueueRef.current.push(
      candidate,
      Boolean(pc?.remoteDescription),
    );
    if (ready && pc) {
      await applyIceCandidate(pc, ready);
    }
  }, []);

  const tryIceRestart = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || pc.signalingState === "closed") return;
    if (reconnectingRef.current) return;
    if (reconnectAttemptsRef.current >= 5) return;
    if (callStateRef.current !== "active") return;
    const remote = remotePeerRef.current;
    if (!remote || !myUserId) return;
    reconnectingRef.current = true;
    setIceRestartPending(true);
    reconnectAttemptsRef.current += 1;
    try {
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);
      emit({
        to: remote,
        from: myUserId,
        type: "offer",
        sdp: offer.sdp,
        callType: isVideoCallRef.current ? "video" : "audio",
        iceRestart: true,
      });
    } catch (e) {
      console.warn("ICE restart failed", e);
    } finally {
      setTimeout(() => {
        reconnectingRef.current = false;
        setIceRestartPending(false);
      }, 2500);
    }
  }, [emit, myUserId]);

  useEffect(() => {
    tryIceRestartRef.current = tryIceRestart;
  }, [tryIceRestart]);

  const attachPeer = useCallback(
    (remoteId) => {
      remotePeerRef.current = remoteId;
      const pc = new RTCPeerConnection(getRtcConfiguration());
      pcRef.current = pc;
      setPeerConnectionState(pc.connectionState);

      pc.onconnectionstatechange = () => {
        const st = pc.connectionState;
        setPeerConnectionState(st);
        if (st === "connected") {
          reconnectAttemptsRef.current = 0;
          if (disconnectTimerRef.current) {
            clearTimeout(disconnectTimerRef.current);
            disconnectTimerRef.current = null;
          }
          if (callStateRef.current === "ringing_out") {
            setCallState("active");
          }
          return;
        }
        if (st !== "disconnected" && st !== "failed") return;
        if (callStateRef.current !== "active") return;
        if (disconnectTimerRef.current) {
          clearTimeout(disconnectTimerRef.current);
        }
        const delay = st === "failed" ? 800 : 8000;
        disconnectTimerRef.current = setTimeout(() => {
          disconnectTimerRef.current = null;
          if (callStateRef.current !== "active") return;
          if (pc.connectionState === "connected") return;
          tryIceRestartRef.current();
        }, delay);
      };

      pc.oniceconnectionstatechange = () => {
        const ice = pc.iceConnectionState;
        if (ice === "connected" || ice === "completed") {
          reconnectAttemptsRef.current = 0;
        }
      };

      pc.onicecandidate = (e) => {
        if (e.candidate && remotePeerRef.current && myUserId) {
          emit({
            to: remotePeerRef.current,
            from: myUserId,
            type: "ice",
            candidate: e.candidate.toJSON(),
          });
        }
      };

      pc.ontrack = (e) => {
        setRemoteStream((prev) => mergeRemoteTrack(prev, e));
      };

      void iceQueueRef.current.flush(pc);

      return pc;
    },
    [emit, myUserId],
  );

  useEffect(() => {
    if (callState !== "active") {
      callActiveSinceRef.current = null;
      setCallElapsedSec(0);
      return;
    }
    callActiveSinceRef.current = Date.now();
    setCallElapsedSec(0);
    const id = setInterval(() => {
      const start = callActiveSinceRef.current;
      if (!start) return;
      setCallElapsedSec(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [callState]);

  const startOutgoing = useCallback(
    async (remoteId, wantVideo, conversationId) => {
      if (!myUserId || !remoteId) return;
      if (!conversationId) {
        setCallNotice("failed");
        return;
      }
      closePeer();
      convIdRef.current = conversationId || null;
      callSessionIdRef.current = createCallSessionId("direct-call");
      try {
        const stream = await acquireCallMedia(
          Boolean(wantVideo),
          selectedAudioInputId,
          selectedVideoInputId,
        );
        const videoCall = Boolean(wantVideo) && stream.getVideoTracks().length > 0;
        setLocalStream(stream);
        setIsVideoCall(videoCall);
        const a = stream.getAudioTracks()[0];
        const v = stream.getVideoTracks()[0];
        setMicMuted(a ? !a.enabled : false);
        setCamOff(v ? !v.enabled : !videoCall);

        const pc = attachPeer(remoteId);
        attachLocalStreamToPeer(pc, stream, videoCall);
        await applyOutboundRtpCaps(pc);

        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: videoCall,
        });
        await pc.setLocalDescription(offer);
        setCallState("ringing_out");
        emit({
          to: remoteId,
          from: myUserId,
          type: "offer",
          sdp: offer.sdp,
          callType: videoCall ? "video" : "audio",
        });
        setCallNotice("");
      } catch (e) {
        console.warn("WebRTC start:", e);
        setCallNotice("failed");
        closePeer({ preserveNotice: true });
      }
    },
    [
      attachPeer,
      closePeer,
      emit,
      myUserId,
      selectedAudioInputId,
      selectedVideoInputId,
    ],
  );

  const acceptIncoming = useCallback(async () => {
    stopIncomingCallRingtone();
    if (!incomingMeta || !myUserId) return;
    const { from, sdp, callType } = incomingMeta;
    try {
      const wantVideo = callType === "video";
      const stream = await acquireCallMedia(
        wantVideo,
        selectedAudioInputId,
        selectedVideoInputId,
      );
      const videoCall = wantVideo && stream.getVideoTracks().length > 0;
      setLocalStream(stream);
      setIsVideoCall(videoCall);
      const a = stream.getAudioTracks()[0];
      const v = stream.getVideoTracks()[0];
      setMicMuted(a ? !a.enabled : false);
      setCamOff(v ? !v.enabled : !videoCall);

      let pc = pcRef.current;
      if (!pc || pc.signalingState === "closed") {
        pc = attachPeer(from);
      }
      attachLocalStreamToPeer(pc, stream, videoCall);
      await applyOutboundRtpCaps(pc);

      if (!pc.remoteDescription) {
        await pc.setRemoteDescription({ type: "offer", sdp });
      }
      await flushIce();

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      setIncomingMeta(null);
      setCallState("active");
      emit({
        to: from,
        from: myUserId,
        type: "answer",
        sdp: answer.sdp,
        conversationId: convIdRef.current,
        callSessionId: callSessionIdRef.current,
      });
      await flushIce();
    } catch (e) {
      console.warn("WebRTC accept:", e);
      setCallNotice("failed");
      closePeer({ preserveNotice: true });
    }
  }, [
    attachPeer,
    closePeer,
    emit,
    flushIce,
    incomingMeta,
    myUserId,
    selectedAudioInputId,
    selectedVideoInputId,
  ]);

  const rejectIncoming = useCallback(() => {
    stopIncomingCallRingtone();
    if (incomingMeta?.from && myUserId) {
      emit({
        to: incomingMeta.from,
        from: myUserId,
        type: "call-decline",
        conversationId: convIdRef.current,
        callSessionId: callSessionIdRef.current,
      });
    }
    setIncomingMeta(null);
    closePeer();
  }, [closePeer, emit, incomingMeta, myUserId]);

  const handleSignal = useCallback(
    async (payload) => {
      if (!payload || !myUserId) return;
      if (payload.groupCall) return;
      const { type, from, to, sdp, candidate, callType } = payload;
      if (String(to) !== String(myUserId)) return;

      if (type === "offer" && sdp) {
        if (
          callStateRef.current === "ringing_in" ||
          callStateRef.current === "ringing_out" ||
          callStateRef.current === "active"
        ) {
          emit({
            to: from,
            from: myUserId,
            type: "call-busy",
            conversationId: convIdRef.current,
            callSessionId: callSessionIdRef.current,
          });
          return;
        }
        const pc = pcRef.current;
        const remoteOk = String(from) === String(remotePeerRef.current);
        if (pc && remoteOk && callStateRef.current === "active") {
          try {
            await pc.setRemoteDescription({ type: "offer", sdp });
            await flushIce();
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            emit({
              to: from,
              from: myUserId,
              type: "answer",
              sdp: answer.sdp,
            });
            await flushIce();
          } catch (e) {
            console.warn("WebRTC renegotiation:", e);
          }
          return;
        }

        convIdRef.current = payload.conversationId || null;
        callSessionIdRef.current =
          payload.callSessionId ||
          callSessionIdRef.current ||
          createCallSessionId("direct-call");
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
        setIsVideoCall((callType || "audio") === "video");
        setIncomingMeta({ from, sdp, callType: callType || "audio" });
        setCallState("ringing_in");

        // Pre-create peer + apply offer so ICE from caller is not lost while ringing.
        try {
          if (!pcRef.current || pcRef.current.signalingState === "closed") {
            attachPeer(from);
          }
          const pc = pcRef.current;
          if (pc && !pc.remoteDescription) {
            await pc.setRemoteDescription({ type: "offer", sdp });
            await flushIce();
          }
        } catch (e) {
          console.warn("WebRTC pre-accept offer:", e);
        }
        return;
      }

      if (type === "answer" && sdp && pcRef.current) {
        try {
          await pcRef.current.setRemoteDescription({ type: "answer", sdp });
          await flushIce();
          setCallState("active");
        } catch (e) {
          console.warn("WebRTC answer:", e);
        }
        return;
      }

      if (type === "ice" && candidate) {
        await addIce(candidate);
        return;
      }

      if (type === "call-hangup" || type === "call-decline") {
        const nextNotice =
          type === "call-decline"
            ? "declined"
            : callStateRef.current === "ringing_in"
              ? "missed"
              : "";
        if (nextNotice) setCallNotice(nextNotice);
        closePeer({ preserveNotice: Boolean(nextNotice) });
        return;
      }

      if (type === "call-busy") {
        setCallNotice("busy");
        closePeer({ preserveNotice: true });
      }
    },
    [addIce, attachPeer, closePeer, emit, flushIce, myUserId, notificationPrefs, userDnd],
  );

  useEffect(() => {
    signalHandlerRef.current = handleSignal;
  }, [handleSignal]);

  useWebRtcSignaling(useCallback((p) => signalHandlerRef.current(p), []));

  const hangup = useCallback(() => {
    if (remotePeerRef.current && myUserId) {
      emit({
        to: remotePeerRef.current,
        from: myUserId,
        type: "call-hangup",
        conversationId: convIdRef.current,
        callSessionId: callSessionIdRef.current,
      });
    }
    closePeer();
  }, [closePeer, emit, myUserId]);

  const toggleMic = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const track = stream.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicMuted(!track.enabled);
  }, []);

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCamOff(!track.enabled);
  }, []);

  const toggleScreenShare = useCallback(async () => {
    const pc = pcRef.current;
    if (!isVideoCall || callState !== "active" || !pc) return;

    if (isScreenSharing) {
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      const cam = cameraVideoTrackRef.current;
      try {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender && cam && cam.readyState === "live") {
          await sender.replaceTrack(cam);
        }
      } catch (e) {
        console.warn("restore camera", e);
      }
      setIsScreenSharing(false);
      return;
    }

    try {
      const dm = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      const vt = dm.getVideoTracks()[0];
      if (!vt) {
        dm.getTracks().forEach((x) => x.stop());
        return;
      }
      const cur = localStreamRef.current;
      const camTrack = cur?.getVideoTracks().find((t) => t.kind === "video");
      if (camTrack && camTrack.readyState === "live") {
        cameraVideoTrackRef.current = camTrack;
      }
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      if (!sender) {
        dm.getTracks().forEach((x) => x.stop());
        return;
      }
      await sender.replaceTrack(vt);
      screenStreamRef.current = dm;
      vt.onended = () => {
        screenStreamRef.current = null;
        const sender2 = pcRef.current?.getSenders().find(
          (s) => s.track?.kind === "video",
        );
        const c = cameraVideoTrackRef.current;
        if (sender2 && c && c.readyState === "live") {
          sender2.replaceTrack(c).catch(() => {});
        }
        setIsScreenSharing(false);
      };
      setIsScreenSharing(true);
    } catch (e) {
      console.warn("Screen share", e);
    }
  }, [callState, isScreenSharing, isVideoCall]);

  const switchInputDevice = useCallback(
    async ({ audioInputId, videoInputId } = {}) => {
      const stream = localStreamRef.current;
      if (!stream || typeof navigator === "undefined") return;

      if (audioInputId !== undefined) setSelectedAudioInputId(audioInputId || "");
      if (videoInputId !== undefined) setSelectedVideoInputId(videoInputId || "");

      const wantsVideo = Boolean(isVideoCallRef.current);
      const audioId = audioInputId ?? selectedAudioInputId;
      const videoId = videoInputId ?? selectedVideoInputId;
      try {
        const constraints = buildCallMediaConstraints(
          wantsVideo,
          audioId,
          videoId,
        );
        const nextStream = await navigator.mediaDevices.getUserMedia(constraints);

        const nextAudio = nextStream.getAudioTracks()[0] || null;
        const nextVideo = nextStream.getVideoTracks()[0] || null;
        const pc = pcRef.current;
        if (pc && nextAudio) {
          const sender = pc.getSenders().find((s) => s.track?.kind === "audio");
          if (sender) await sender.replaceTrack(nextAudio);
        }
        if (pc && nextVideo) {
          const sender = pc.getSenders().find((s) => s.track?.kind === "video");
          if (sender) await sender.replaceTrack(nextVideo);
        }

        stream.getTracks().forEach((t) => t.stop());
        setLocalStream(nextStream);
        localStreamRef.current = nextStream;
        const a = nextStream.getAudioTracks()[0];
        const v = nextStream.getVideoTracks()[0];
        setMicMuted(a ? !a.enabled : false);
        setCamOff(v ? !v.enabled : !wantsVideo);
        await refreshDevices();
      } catch (e) {
        console.warn("Switch call input device", e);
      }
    },
    [
      refreshDevices,
      selectedAudioInputId,
      selectedVideoInputId,
      setSelectedAudioInputId,
      setSelectedVideoInputId,
    ],
  );

  return {
    localStream,
    remoteStream,
    callState,
    peerConnectionState,
    incomingMeta,
    callElapsedSec,
    isVideoCall,
    micMuted,
    camOff,
    isScreenSharing,
    iceRestartPending,
    callNotice,
    startOutgoing,
    acceptIncoming,
    rejectIncoming,
    hangup,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    audioInputs,
    videoInputs,
    audioOutputs,
    selectedAudioInputId,
    selectedVideoInputId,
    selectedAudioOutputId,
    setSelectedAudioOutputId,
    switchInputDevice,
  };
}
