"use client";

import { useState } from "react";

export function useMessageComposer() {
  const [text, setText] = useState("");
  const [pollOpen, setPollOpen] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [pollAllowsMultiple, setPollAllowsMultiple] = useState(false);
  const [pollClosesAt, setPollClosesAt] = useState("");
  const [disappearAfterSec, setDisappearAfterSec] = useState(0);
  const [viewOnceNext, setViewOnceNext] = useState(false);
  const [emojiComposerOpen, setEmojiComposerOpen] = useState(false);
  const [voiceDraft, setVoiceDraft] = useState(null);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voiceMsg, setVoiceMsg] = useState("");
  const [shareContactOpen, setShareContactOpen] = useState(false);
  const [shareContactQuery, setShareContactQuery] = useState("");
  const [shareContactBusy, setShareContactBusy] = useState(false);
  const [shareLocationOpen, setShareLocationOpen] = useState(false);
  const [mentionsOnly, setMentionsOnly] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [uploading, setUploading] = useState(null);
  const [failedUpload, setFailedUpload] = useState(null);

  return {
    text,
    setText,
    pollOpen,
    setPollOpen,
    pollQuestion,
    setPollQuestion,
    pollOptions,
    setPollOptions,
    pollAllowsMultiple,
    setPollAllowsMultiple,
    pollClosesAt,
    setPollClosesAt,
    disappearAfterSec,
    setDisappearAfterSec,
    viewOnceNext,
    setViewOnceNext,
    emojiComposerOpen,
    setEmojiComposerOpen,
    voiceDraft,
    setVoiceDraft,
    voiceOpen,
    setVoiceOpen,
    voiceMsg,
    setVoiceMsg,
    shareContactOpen,
    setShareContactOpen,
    shareContactQuery,
    setShareContactQuery,
    shareContactBusy,
    setShareContactBusy,
    shareLocationOpen,
    setShareLocationOpen,
    mentionsOnly,
    setMentionsOnly,
    mentionIndex,
    setMentionIndex,
    uploading,
    setUploading,
    failedUpload,
    setFailedUpload,
  };
}
