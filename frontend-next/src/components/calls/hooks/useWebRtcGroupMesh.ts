// @ts-nocheck
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAppSelector } from "@/store/hooks";

import {
  emitWebRtcSignal,
  useWebRtcSignaling,
} from "@/components/calls/hooks/useWebRtcSignaling";
import { applyOutboundRtpCaps } from "@/lib/webrtcSendCaps";
import { getRtcConfiguration } from "@/lib/webrtcRtcConfig";
import { useCallDevicePreferences } from "@/components/calls/hooks/useCallDevicePreferences";
import { stopIncomingCallRingtone } from "@/lib/callRingtone";

const MAX_GROUP_PEERS = 8;

function createCallSessionId(prefix = "call") {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useWebRtcGroupMesh(myUserId, conversationId) {
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
  const [remoteStreams, setRemoteStreams] = useState(() => ({}));
  const [callState, setCallState] = useState("idle");
  const [incomingMeta, setIncomingMeta] = useState(null);
  const [isVideoCall, setIsVideoCall] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [callElapsedSec, setCallElapsedSec] = useState(0);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const peersRef = useRef(new Map());
  const convIdRef = useRef(null);
  const callSessionIdRef = useRef(null);
  const localStreamRef = useRef(null);
  const signalHandlerRef = useRef(() => {});
  const callStateRef = useRef(callState);
  const isVideoCallRef = useRef(isVideoCall);
  const tryGroupIceRestartRef = useRef(async () => {});
  const screenStreamRef = useRef(null);
  const cameraVideoTrackRef = useRef(null);
  const pendingOffersRef = useRef(new Map());
  const dismissedSessionsRef = useRef(new Set());
  const alertedSessionsRef = useRef(new Set());

  const buildMediaConstraints = useCallback(
    (wantVideo) => ({
      audio: selectedAudioInputId
        ? { deviceId: { exact: selectedAudioInputId } }
        : true,
      video: wantVideo
        ? selectedVideoInputId
          ? { deviceId: { exact: selectedVideoInputId } }
          : true
        : false,
    }),
    [selectedAudioInputId, selectedVideoInputId]
  );

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);
  useEffect(() => {
    isVideoCallRef.current = isVideoCall;
  }, [isVideoCall]);

  const emitSignal = useCallback((payload) => {
    emitWebRtcSignal({
      ...payload,
      conversationId: convIdRef.current ?? payload.conversationId,
      callSessionId: callSessionIdRef.current ?? payload.callSessionId,
      groupCall: true,
    });
  }, []);

  useEffect(() => {
    if (callState !== "active") {
      setCallElapsedSec(0);
      return;
    }
    const start = Date.now();
    setCallElapsedSec(0);
    const id = setInterval(() => {
      setCallElapsedSec(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [callState]);

  const setStreamForPeer = useCallback((peerId, stream) => {
    const key = String(peerId);
    setRemoteStreams((prev) => {
      if (!stream) {
        if (!(key in prev)) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: stream };
    });
  }, []);

  const removePeer = useCallback(
    (peerId) => {
      const key = String(peerId);
      const entry = peersRef.current.get(key);
      if (entry) {
        if (entry.restartTimer) {
          clearTimeout(entry.restartTimer);
          entry.restartTimer = null;
        }
        try {
          entry.pc.close();
        } catch {}
        peersRef.current.delete(key);
      }
      setStreamForPeer(key, null);
    },
    [setStreamForPeer]
  );

  const tryGroupIceRestart = useCallback(
    async (peerId) => {
      const key = String(peerId);
      const entry = peersRef.current.get(key);
      if (!entry?.pc || entry.pc.signalingState === "closed") return;
      if (entry.reconnecting) return;
      if (entry.reconnectAttempts >= 5) return;
      if (callStateRef.current !== "active") return;
      if (!entry.isOfferer) return;
      entry.reconnecting = true;
      entry.reconnectAttempts += 1;
      try {
        const offer = await entry.pc.createOffer({ iceRestart: true });
        await entry.pc.setLocalDescription(offer);
        emitSignal({
          to: key,
          from: myUserId,
          type: "offer",
          sdp: offer.sdp,
          callType: isVideoCallRef.current ? "video" : "audio",
          iceRestart: true,
        });
      } catch (e) {
        console.warn("Group ICE restart", e);
      } finally {
        setTimeout(() => {
          entry.reconnecting = false;
        }, 2500);
      }
    },
    [emitSignal, myUserId]
  );

  useEffect(() => {
    tryGroupIceRestartRef.current = tryGroupIceRestart;
  }, [tryGroupIceRestart]);

  const internalClose = useCallback(() => {
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    cameraVideoTrackRef.current = null;
    setIsScreenSharing(false);

    peersRef.current.forEach((entry) => {
      if (entry.restartTimer) {
        clearTimeout(entry.restartTimer);
        entry.restartTimer = null;
      }
      try {
        entry.pc.close();
      } catch {}
    });
    peersRef.current.clear();
    setRemoteStreams({});
    setLocalStream((s) => {
      s?.getTracks().forEach((t) => t.stop());
      return null;
    });
    localStreamRef.current = null;
    pendingOffersRef.current.clear();
    convIdRef.current = null;
    callSessionIdRef.current = null;
    setCallState("idle");
    setIncomingMeta(null);
    setIsVideoCall(false);
    setMicMuted(false);
    setCamOff(false);
    setCallElapsedSec(0);
  }, []);

  const flushIce = useCallback(async (peerId) => {
    const key = String(peerId);
    const entry = peersRef.current.get(key);
    if (!entry?.pc?.remoteDescription) return;
    const list = entry.pendingIce.splice(0);
    for (const c of list) {
      try {
        await entry.pc.addIceCandidate(new RTCIceCandidate(c));
      } catch {}
    }
  }, []);

  const addIce = useCallback(
    async (peerId, candidate) => {
      const key = String(peerId);
      const entry = peersRef.current.get(key);
      if (!entry || !candidate) return;
      if (!entry.pc.remoteDescription) {
        entry.pendingIce.push(candidate);
        return;
      }
      try {
        await entry.pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {}
    },
    []
  );

  const createPeer = useCallback(
    (remoteId, isOfferer = false) => {
      const key = String(remoteId);
      removePeer(key);
      const pc = new RTCPeerConnection(getRtcConfiguration());
      const entry = {
        pc,
        pendingIce: [],
        isOfferer,
        restartTimer: null,
        reconnecting: false,
        reconnectAttempts: 0,
      };
      peersRef.current.set(key, entry);

      pc.onconnectionstatechange = () => {
        const st = pc.connectionState;
        if (st === "connected") {
          entry.reconnectAttempts = 0;
          if (entry.restartTimer) {
            clearTimeout(entry.restartTimer);
            entry.restartTimer = null;
          }
          return;
        }
        if (st !== "disconnected" && st !== "failed") return;
        if (callStateRef.current !== "active") return;
        if (!entry.isOfferer) return;
        if (entry.restartTimer) clearTimeout(entry.restartTimer);
        const delay = st === "failed" ? 400 : 2800;
        entry.restartTimer = setTimeout(() => {
          entry.restartTimer = null;
          const cur = peersRef.current.get(key);
          if (!cur?.pc || cur.pc.connectionState === "connected") return;
          if (callStateRef.current !== "active") return;
          tryGroupIceRestartRef.current(key);
        }, delay);
      };

      pc.onicecandidate = (e) => {
        if (e.candidate && myUserId && convIdRef.current) {
          emitSignal({
            to: key,
            from: myUserId,
            type: "ice",
            candidate: e.candidate.toJSON(),
          });
        }
      };
      pc.ontrack = (e) => {
        const s = e.streams[0];
        if (s) setStreamForPeer(key, s);
      };
      return pc;
    },
    [emitSignal, myUserId, removePeer, setStreamForPeer]
  );

  const acceptIncoming = useCallback(async () => {
    stopIncomingCallRingtone();
    if (!myUserId || !incomingMeta) return;
    const offers = [...pendingOffersRef.current.entries()];
    if (!offers.length) {
      internalClose();
      return;
    }

    try {
      const wantVideo = incomingMeta.callType === "video";
      let stream = localStreamRef.current;
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia(
          buildMediaConstraints(wantVideo)
        );
        localStreamRef.current = stream;
        setLocalStream(stream);
      }
      setIsVideoCall(wantVideo);
      const a = stream.getAudioTracks()[0];
      const v = stream.getVideoTracks()[0];
      setMicMuted(a ? !a.enabled : false);
      setCamOff(v ? !v.enabled : !wantVideo);

      let answeredCount = 0;
      for (const [from, offerMeta] of offers) {
        try {
          const pc = createPeer(from, false);
          stream.getTracks().forEach((t) => pc.addTrack(t, stream));
          await applyOutboundRtpCaps(pc);
          await pc.setRemoteDescription({ type: "offer", sdp: offerMeta.sdp });
          await flushIce(from);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          emitSignal({
            to: from,
            from: myUserId,
            type: "answer",
            sdp: answer.sdp,
          });
          answeredCount += 1;
        } catch (error) {
          console.warn("Group WebRTC accept:", error);
          removePeer(from);
        }
      }

      pendingOffersRef.current.clear();
      setIncomingMeta(null);
      if (answeredCount > 0) {
        setCallState("active");
      } else {
        internalClose();
      }
    } catch (error) {
      console.warn("Group WebRTC incoming media:", error);
      internalClose();
    }
  }, [
    buildMediaConstraints,
    createPeer,
    emitSignal,
    flushIce,
    incomingMeta,
    internalClose,
    myUserId,
    removePeer,
  ]);

  const rejectIncoming = useCallback(() => {
    stopIncomingCallRingtone();
    const sessionId = String(incomingMeta?.callSessionId || "").trim();
    if (sessionId) dismissedSessionsRef.current.add(sessionId);
    if (myUserId) {
      for (const from of pendingOffersRef.current.keys()) {
        emitSignal({
          to: from,
          from: myUserId,
          type: "call-decline",
        });
      }
    }
    internalClose();
  }, [emitSignal, incomingMeta?.callSessionId, internalClose, myUserId]);

  const startGroupCall = useCallback(
    async (peerIds, wantVideo, activeConversationId = null) => {
      const cid = String(activeConversationId || conversationId || "");
      if (!myUserId || !cid) return;
      const ids = [...new Set(peerIds.map(String))]
        .filter((id) => id !== String(myUserId))
        .slice(0, MAX_GROUP_PEERS);
      if (!ids.length) return;

      internalClose();
      convIdRef.current = cid;
      callSessionIdRef.current = createCallSessionId("group-call");

      try {
        const stream = await navigator.mediaDevices.getUserMedia(
          buildMediaConstraints(Boolean(wantVideo))
        );
        localStreamRef.current = stream;
        setLocalStream(stream);
        setIsVideoCall(Boolean(wantVideo));
        const a = stream.getAudioTracks()[0];
        const v = stream.getVideoTracks()[0];
        setMicMuted(a ? !a.enabled : false);
        setCamOff(v ? !v.enabled : !wantVideo);
        setCallState("ringing_out");

        for (const pid of ids) {
          const pc = createPeer(pid, true);
          stream.getTracks().forEach((t) => pc.addTrack(t, stream));
          await applyOutboundRtpCaps(pc);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          emitSignal({
            to: pid,
            from: myUserId,
            type: "offer",
            sdp: offer.sdp,
            callType: wantVideo ? "video" : "audio",
          });
        }
        setCallState("active");
      } catch (e) {
        console.warn("Group WebRTC start:", e);
        internalClose();
      }
    },
    [
      buildMediaConstraints,
      conversationId,
      createPeer,
      emitSignal,
      internalClose,
      myUserId,
    ]
  );

  const handleSignal = useCallback(
    async (payload) => {
      if (!payload || !myUserId) return;
      if (!payload.groupCall) return;
      if (String(payload.to) !== String(myUserId)) return;
      const cidProp = conversationId ? String(conversationId) : "";
      const cidPayload = payload.conversationId
        ? String(payload.conversationId)
        : "";
      if (cidProp && cidPayload && cidProp !== cidPayload) return;

      const { type, from, sdp, candidate, callType } = payload;
      if (!from || String(from) === String(myUserId)) return;

      if (type === "offer" && sdp) {
        const nextSessionId = String(payload.callSessionId || "").trim();
        if (nextSessionId && dismissedSessionsRef.current.has(nextSessionId)) {
          emitSignal({
            to: from,
            from: myUserId,
            type: "call-decline",
          });
          return;
        }
        if (
          callStateRef.current === "ringing_in" &&
          nextSessionId &&
          nextSessionId === String(callSessionIdRef.current || "")
        ) {
          pendingOffersRef.current.set(String(from), {
            sdp,
            callType: callType || "audio",
          });
          return;
        }
        if (callStateRef.current === "ringing_out") {
          emitSignal({
            to: from,
            from: myUserId,
            type: "call-busy",
          });
          return;
        }
        const existing = peersRef.current.get(String(from));
        if (
          existing?.pc &&
          existing.pc.signalingState === "stable" &&
          existing.pc.localDescription &&
          existing.pc.remoteDescription
        ) {
          convIdRef.current = cidPayload || convIdRef.current || cidProp;
          callSessionIdRef.current =
            payload.callSessionId || callSessionIdRef.current || createCallSessionId("group-call");
          try {
            await existing.pc.setRemoteDescription({ type: "offer", sdp });
            await flushIce(from);
            const answer = await existing.pc.createAnswer();
            await existing.pc.setLocalDescription(answer);
            emitSignal({
              to: from,
              from: myUserId,
              type: "answer",
              sdp: answer.sdp,
            });
          } catch (e) {
            console.warn("Group WebRTC renegotiation:", e);
          }
          return;
        }

        convIdRef.current = cidPayload || convIdRef.current || cidProp;
        callSessionIdRef.current =
          payload.callSessionId || callSessionIdRef.current || createCallSessionId("group-call");
        const wantVideo = (callType || "audio") === "video";
        setIsVideoCall(wantVideo);
        if (
          callStateRef.current === "idle" &&
          nextSessionId &&
          typeof document !== "undefined" &&
          document.hidden &&
          notificationPrefs?.callIncoming !== false &&
          !Boolean(notificationPrefs?.doNotDisturb || userDnd) &&
          typeof Notification !== "undefined" &&
          Notification.permission === "granted" &&
          !alertedSessionsRef.current.has(nextSessionId)
        ) {
          alertedSessionsRef.current.add(nextSessionId);
          try {
            new Notification("Vegasphere", {
              body:
                wantVideo
                  ? "Incoming group video call"
                  : "Incoming group voice call",
              tag: nextSessionId,
            });
          } catch {}
        }
        pendingOffersRef.current.set(String(from), {
          sdp,
          callType: callType || "audio",
        });
        setIncomingMeta({
          from: String(from),
          callType: callType || "audio",
          callSessionId: nextSessionId,
        });
        setCallState("ringing_in");
        return;
      }

      if (type === "answer" && sdp) {
        const entry = peersRef.current.get(String(from));
        if (!entry?.pc) return;
        try {
          await entry.pc.setRemoteDescription({ type: "answer", sdp });
          await flushIce(from);
        } catch (e) {
          console.warn("Group WebRTC answer:", e);
        }
        return;
      }

      if (type === "ice" && candidate) {
        await addIce(from, candidate);
        return;
      }

      if (type === "call-hangup" || type === "call-decline") {
        removePeer(from);
        if (peersRef.current.size === 0) {
          internalClose();
        }
      }
    },
    [
      addIce,
      conversationId,
      emitSignal,
      flushIce,
      internalClose,
      myUserId,
      notificationPrefs,
      removePeer,
      userDnd,
    ]
  );

  useEffect(() => {
    signalHandlerRef.current = handleSignal;
  }, [handleSignal]);

  useWebRtcSignaling(useCallback((p) => signalHandlerRef.current(p), []));

  const hangup = useCallback(() => {
    const ids = [...peersRef.current.keys()];
    const cid = convIdRef.current;
    if (myUserId && cid) {
      for (const pid of ids) {
        emitSignal({
          to: pid,
          from: myUserId,
          type: "call-hangup",
        });
      }
    }
    internalClose();
  }, [emitSignal, internalClose, myUserId]);

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
    if (!isVideoCall || callState !== "active") return;
    if (!peersRef.current.size) return;

    if (isScreenSharing) {
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      const cam = cameraVideoTrackRef.current;
      for (const entry of peersRef.current.values()) {
        try {
          const sender = entry.pc
            .getSenders()
            .find((s) => s.track?.kind === "video");
          if (sender && cam && cam.readyState === "live") {
            await sender.replaceTrack(cam);
          }
        } catch {}
      }
      setIsScreenSharing(false);
      return;
    }

    try {
      const dm = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
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
      let any = false;
      for (const entry of peersRef.current.values()) {
        const sender = entry.pc
          .getSenders()
          .find((s) => s.track?.kind === "video");
        if (sender) {
          await sender.replaceTrack(vt);
          any = true;
        }
      }
      if (!any) {
        dm.getTracks().forEach((x) => x.stop());
        return;
      }
      screenStreamRef.current = dm;
      vt.onended = () => {
        screenStreamRef.current = null;
        const cam = cameraVideoTrackRef.current;
        for (const entry of peersRef.current.values()) {
          const sender = entry.pc
            .getSenders()
            .find((s) => s.track?.kind === "video");
          if (sender && cam && cam.readyState === "live") {
            sender.replaceTrack(cam).catch(() => {});
          }
        }
        setIsScreenSharing(false);
      };
      setIsScreenSharing(true);
    } catch (e) {
      console.warn("Group screen share", e);
    }
  }, [callState, isScreenSharing, isVideoCall]);

  const switchInputDevice = useCallback(
    async ({
      audioInputId,
      videoInputId,
    }: {
      audioInputId?: string;
      videoInputId?: string;
    }) => {
      const stream = localStreamRef.current;
      if (!stream || typeof navigator === "undefined") return;

      if (audioInputId !== undefined) setSelectedAudioInputId(audioInputId || "");
      if (videoInputId !== undefined) setSelectedVideoInputId(videoInputId || "");

      const wantsVideo = Boolean(isVideoCallRef.current);
      try {
        const nextStream = await navigator.mediaDevices.getUserMedia({
          audio:
            audioInputId || selectedAudioInputId
              ? { deviceId: { exact: audioInputId || selectedAudioInputId } }
              : true,
          video: wantsVideo
            ? videoInputId || selectedVideoInputId
              ? { deviceId: { exact: videoInputId || selectedVideoInputId } }
              : true
            : false,
        });

        const nextAudio = nextStream.getAudioTracks()[0] || null;
        const nextVideo = nextStream.getVideoTracks()[0] || null;
        for (const entry of peersRef.current.values()) {
          if (nextAudio) {
            const audioSender = entry.pc
              .getSenders()
              .find((s) => s.track?.kind === "audio");
            if (audioSender) await audioSender.replaceTrack(nextAudio);
          }
          if (nextVideo) {
            const videoSender = entry.pc
              .getSenders()
              .find((s) => s.track?.kind === "video");
            if (videoSender) await videoSender.replaceTrack(nextVideo);
          }
        }

        stream.getTracks().forEach((t) => t.stop());
        localStreamRef.current = nextStream;
        setLocalStream(nextStream);
        const a = nextStream.getAudioTracks()[0];
        const v = nextStream.getVideoTracks()[0];
        setMicMuted(a ? !a.enabled : false);
        setCamOff(v ? !v.enabled : !wantsVideo);
        await refreshDevices();
      } catch (e) {
        console.warn("Switch group call input device", e);
      }
    },
    [
      refreshDevices,
      selectedAudioInputId,
      selectedVideoInputId,
      setSelectedAudioInputId,
      setSelectedVideoInputId,
    ]
  );

  const prevConversationIdRef = useRef(null);
  useEffect(() => {
    const prev = prevConversationIdRef.current;
    prevConversationIdRef.current = conversationId;
    if (prev != null && String(prev) !== String(conversationId)) {
      internalClose();
    }
  }, [conversationId, internalClose]);

  useEffect(() => {
    return () => {
      /* Ref snapshot at unmount — must be current Map, not a render snapshot */
      // eslint-disable-next-line react-hooks/exhaustive-deps -- peersRef is mutable WebRTC state, not DOM
      const peerMap = peersRef.current;
      const ids = [...peerMap.keys()];
      const cid = convIdRef.current;
      const me = myUserId;
      if (me && cid && ids.length) {
        for (const pid of ids) {
          emitSignal({
            to: pid,
            from: me,
            type: "call-hangup",
          });
        }
      }
      peerMap.forEach((entry) => {
        if (entry.restartTimer) clearTimeout(entry.restartTimer);
        try {
          entry.pc.close();
        } catch {}
      });
      peerMap.clear();
      const s = localStreamRef.current;
      s?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [emitSignal, myUserId]);

  return {
    localStream,
    remoteStreams,
    callState,
    incomingMeta,
    callElapsedSec,
    isVideoCall,
    micMuted,
    camOff,
    isScreenSharing,
    startGroupCall,
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
