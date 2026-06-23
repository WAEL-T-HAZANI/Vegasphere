// @ts-nocheck

"use client";

import { useCallback } from "react";
import { api } from "@/lib/api";
import { API_ORIGIN } from "@/lib/constants";
import { showAppToast } from "@/lib/appToast";
import { formatApiError } from "@/lib/apiError";

const ALLOWED_MIME_PREFIXES = ["image/", "video/", "audio/"];
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/vnd.rar",
  "application/x-rar-compressed",
  "application/x-rar",
]);
const ALLOWED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".mp4",
  ".webm",
  ".mov",
  ".mp3",
  ".m4a",
  ".wav",
  ".ogg",
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".txt",
  ".csv",
  ".zip",
  ".rar",
]);

const ATTACH_ACCEPT =
  "image/*,video/*,audio/*,.png,.jpeg,.jpg,.gif,.mp4,.mp3,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar";

function getFileExtension(name) {
  const value = String(name || "");
  const idx = value.lastIndexOf(".");
  return idx >= 0 ? value.slice(idx).toLowerCase() : "";
}

function isAllowedAttachment(file) {
  const mime = String(file?.type || "").toLowerCase();
  const ext = getFileExtension(file?.name);
  if (!ALLOWED_EXTENSIONS.has(ext)) return false;
  if (!mime) return true;
  return (
    ALLOWED_MIME_TYPES.has(mime) ||
    ALLOWED_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix))
  );
}

function resolveAttachmentDraftMeta(file) {
  const mime = String(file?.type || "").toLowerCase();
  const ext = getFileExtension(file?.name);
  const isImage =
    mime.startsWith("image/") ||
    [".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext);
  const isVideo =
    mime.startsWith("video/") ||
    [".mp4", ".webm", ".mov"].includes(ext);
  const isAudio =
    mime.startsWith("audio/") ||
    [".mp3", ".m4a", ".wav", ".ogg"].includes(ext);

  if (isImage) {
    return { kind: "file", uploadKind: "image", preview: true };
  }
  if (isVideo) {
    return { kind: "file", uploadKind: "video", preview: true };
  }
  if (isAudio) {
    return { kind: "audio", uploadKind: "audio", preview: false };
  }
  return { kind: "file", uploadKind: "file", preview: false };
}

export function useChatAttachments({
  conversationId,
  cid,
  user,
  t,
  activeConv,
  activeTopicId,
  disappearAfterSec,
  viewOnceNext,
  setViewOnceNext,
  deliverOutgoing,
  setUploading,
  setFailedUpload,
  setVoiceMsg,
  failedUpload,
  setShareContactOpen,
  setShareContactQuery,
  setShareContactBusy,
}) {
  const revokeUploadPreview = useCallback((draft) => {
    if (!draft?.previewUrl) return;
    try {
      URL.revokeObjectURL(draft.previewUrl);
    } catch {}
  }, []);

  const clearFailedUpload = useCallback(() => {
    if (failedUpload) revokeUploadPreview(failedUpload);
    setFailedUpload(null);
    setVoiceMsg("");
  }, [failedUpload, revokeUploadPreview, setFailedUpload, setVoiceMsg]);

  const uploadAttachmentDraft = useCallback(
    async (draft) => {
      if (!draft?.file || !user?._id || !conversationId) {
        return { ok: false, message: t("messageUploadFailed") };
      }
      setUploading({ kind: draft.kind, name: draft.name, progress: 0 });
      setFailedUpload(null);
      setVoiceMsg("");
      let uploadToken = String(draft.uploadToken || "").trim();
      let uploadedUrl = String(draft.uploadedUrl || "").trim();
      try {
        let data = null;
        if (!uploadToken) {
          const form = new FormData();
          form.append(
            "file",
            draft.file,
            draft.fileName || draft.name || "attachment",
          );
          form.append("kind", draft.uploadKind || draft.kind || "file");
          const response = await api.post("/message/upload", form, {
            headers: { "Content-Type": "multipart/form-data" },
            onUploadProgress: (evt) => {
              const total = Number(evt.total || 0);
              const loaded = Number(evt.loaded || 0);
              const progress =
                total > 0
                  ? Math.min(100, Math.round((loaded / total) * 100))
                  : 0;
              setUploading({ kind: draft.kind, name: draft.name, progress });
            },
          });
          data = response?.data || {};
          uploadToken = String(data?.uploadToken || "").trim();
          uploadedUrl = data?.url
            ? String(data.url).startsWith("http")
              ? data.url
              : `${API_ORIGIN}${data.url}`
            : "";
        }
        const resolvedKind =
          data?.kind || draft.uploadKind || draft.kind || "file";
        const sendPayloadBase = {
          conversationId: draft.conversationId || conversationId,
          senderId: user._id,
          topicId: draft.topicId || "general",
          uploadToken,
        };
        if (draft.kind === "audio") {
          const sendResult = await deliverOutgoing({
            ...sendPayloadBase,
            text: "",
            messageType: "audio",
            audioData: uploadedUrl,
            audioDuration: draft.audioDuration || 0,
          });
          if (!sendResult?.ok) {
            throw sendResult?.error || new Error(t("messageSendFailed"));
          }
          if (draft.viewOnce) setViewOnceNext?.(false);
          revokeUploadPreview(draft);
          return { ok: true };
        }
        const sendResult = await deliverOutgoing({
          ...sendPayloadBase,
          text: draft.text || draft.fileName || draft.name || "",
          messageType:
            resolvedKind === "image"
              ? "image"
              : resolvedKind === "video"
                ? "video"
                : "file",
          imageUrl:
            resolvedKind === "image" || resolvedKind === "video"
              ? uploadedUrl || draft.previewUrl || ""
              : "",
          fileName: data?.fileName || draft.fileName || draft.name || "",
          fileType:
            data?.fileType || draft.fileType || "application/octet-stream",
          fileSize: data?.fileSize || draft.fileSize || 0,
          fileData:
            resolvedKind === "image" || resolvedKind === "video"
              ? ""
              : uploadedUrl,
          disappearAfterSec: draft.disappearAfterSec || 0,
          viewOnce: Boolean(draft.viewOnce),
        });
        if (!sendResult?.ok) {
          throw sendResult?.error || new Error(t("messageSendFailed"));
        }
        if (draft.viewOnce) setViewOnceNext?.(false);
        revokeUploadPreview(draft);
        return { ok: true };
      } catch (error) {
        const message =
          formatApiError(error, t) ||
          t("messageUploadFailed");
        setFailedUpload({
          ...draft,
          uploadToken: draft.uploadToken || uploadToken || "",
          uploadedUrl: draft.uploadedUrl || uploadedUrl || "",
          error: message,
        });
        showAppToast({
          id: `upload-${Date.now()}`,
          conversationId: cid,
          body: message,
        });
        return { ok: false, message };
      } finally {
        setUploading(null);
      }
    },
    [
      cid,
      conversationId,
      deliverOutgoing,
      revokeUploadPreview,
      t,
      user?._id,
      setUploading,
      setFailedUpload,
      setVoiceMsg,
    ],
  );

  const onFileChange = useCallback(
    (e) => {
      const f = e.target.files?.[0];
      if (!f || !user?._id) return;
      if (!isAllowedAttachment(f)) {
        showAppToast({
          id: `attach-unsupported-${Date.now()}`,
          conversationId: cid,
          body:
            t("attachUnsupportedType") ||
            "This file type is not supported.",
        });
        e.target.value = "";
        return;
      }
      const meta = resolveAttachmentDraftMeta(f);
      let previewUrl = "";
      if (meta.preview) {
        try {
          previewUrl = URL.createObjectURL(f);
        } catch {
          previewUrl = "";
        }
      }
      uploadAttachmentDraft({
        kind: meta.kind,
        uploadKind: meta.uploadKind,
        file: f,
        name: f.name,
        text: f.name,
        fileName: f.name,
        fileType: f.type || "application/octet-stream",
        fileSize: f.size,
        previewUrl,
        topicId: activeTopicId || "general",
        disappearAfterSec,
        viewOnce: viewOnceNext,
      });
      e.target.value = "";
    },
    [
      cid,
      t,
      user?._id,
      viewOnceNext,
      uploadAttachmentDraft,
      activeTopicId,
      disappearAfterSec,
    ],
  );

  const sendLocationMessage = useCallback(
    async (lat, lng, label) => {
      const result = await deliverOutgoing({
        conversationId,
        senderId: user._id,
        messageType: "location",
        text: "",
        location: { lat, lng, label },
        topicId:
          activeConv?.isGroup || activeConv?.isChannel
            ? activeTopicId || "general"
            : undefined,
      });
      if (!result?.ok) {
        throw result?.error || new Error(t("messageSendFailed"));
      }
      if (viewOnceNext) setViewOnceNext?.(false);
      return result;
    },
    [
      activeConv?.isChannel,
      activeConv?.isGroup,
      activeTopicId,
      conversationId,
      deliverOutgoing,
      t,
      user?._id,
    ],
  );

  const shareMyLocation = useCallback(async () => {
    if (!user?._id || !conversationId) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      showAppToast({
        id: `geo-${Date.now()}`,
        conversationId: cid,
        body:
          t("locationNotSupported") ||
          "Location is not supported on this device.",
      });
      return;
    }

    setShareContactBusy(true);
    const defaultLabel = t("sharedLocationLabel") || "Shared location";

    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 15_000,
          maximumAge: 60_000,
        });
      });
      const lat = Number(pos?.coords?.latitude);
      const lng = Number(pos?.coords?.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw Object.assign(new Error("Invalid location"), { code: "INVALID" });
      }
      await sendLocationMessage(lat, lng, defaultLabel);
      return;
    } catch (geoErr) {
      const geoCode = Number(geoErr?.code);
      const canFallback =
        geoCode === 1 ||
        geoCode === 2 ||
        geoCode === 3 ||
        geoErr?.code === "INVALID";

      if (!canFallback) {
        showAppToast({
          id: `geo-send-fail-${Date.now()}`,
          conversationId: cid,
          body: formatApiError(geoErr, t, "messageSendFailed"),
        });
        return;
      }

      try {
        const { data } = await api.get("/utility/geoip");
        const lat = Number(data?.lat);
        const lng = Number(data?.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          throw new Error("GeoIP failed");
        }
        const labelParts = [data?.city, data?.region, data?.country].filter(
          Boolean,
        );
        const label = labelParts.length ? labelParts.join(", ") : defaultLabel;
        await sendLocationMessage(lat, lng, label);
        showAppToast({
          id: `geoip-${Date.now()}`,
          conversationId: cid,
          body: t("locationApproximate") || "Shared approximate location.",
        });
      } catch (fallbackErr) {
        showAppToast({
          id: `geo-fail-${Date.now()}`,
          conversationId: cid,
          body: formatApiError(fallbackErr, t, "locationPermissionDenied"),
        });
      }
    } finally {
      setShareContactBusy(false);
    }
  }, [
    activeConv?.isChannel,
    activeConv?.isGroup,
    activeTopicId,
    cid,
    conversationId,
    sendLocationMessage,
    t,
    user?._id,
    setShareContactBusy,
  ]);

  const sharePersonAsContact = useCallback(
    async (person) => {
      const pid = person?._id ? String(person._id) : "";
      if (!pid || !user?._id || !conversationId) return;
      const label = String(
        person?.name || person?.username || person?.email || "",
      ).trim();
      const payload = {
        contactUserId: pid,
        name: person?.name || "",
        username: person?.username || "",
        email: person?.email || "",
        profilePic: person?.profilePic || "",
      };
      await deliverOutgoing({
        conversationId,
        senderId: user._id,
        messageType: "contact",
        text: label || t("sharedContactLabel") || "Shared contact",
        fileData: JSON.stringify(payload),
        topicId:
          activeConv?.isGroup || activeConv?.isChannel
            ? activeTopicId || "general"
            : undefined,
      });
      setShareContactOpen(false);
      setShareContactQuery("");
    },
    [
      activeConv?.isChannel,
      activeConv?.isGroup,
      activeTopicId,
      conversationId,
      deliverOutgoing,
      t,
      user?._id,
      setShareContactOpen,
      setShareContactQuery,
    ],
  );

  return {
    uploadAttachmentDraft,
    onFileChange,
    attachAccept: ATTACH_ACCEPT,
    shareMyLocation,
    sharePersonAsContact,
    clearFailedUpload,
    revokeUploadPreview,
  };
}
