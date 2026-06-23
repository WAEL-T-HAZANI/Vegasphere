"use client";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setAiReplyTone, type AiReplyTone } from "@/store/slices/uiSlice";

export const AI_TONE_STORAGE_KEY = "vegasphere-ai-tone";

export const AI_REPLY_TONES: AiReplyTone[] = [
  "default",
  "friendly",
  "formal",
  "short",
  "funny",
];

export function isAiReplyTone(value: string): value is AiReplyTone {
  return AI_REPLY_TONES.includes(value as AiReplyTone);
}

export function useAiReplyTone() {
  const dispatch = useAppDispatch();
  const tone = useAppSelector((s) => s.ui.aiReplyTone);

  const setTone = (next: AiReplyTone) => {
    dispatch(setAiReplyTone(next));
  };

  return { tone, setTone };
}
