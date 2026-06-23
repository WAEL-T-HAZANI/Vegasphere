"use client";

import { useEffect, useState } from "react";
import EmojiPicker, { Theme } from "emoji-picker-react";

type ComposerEmojiPickerProps = {
  onPick: (_emoji: string) => void;
  searchPlaceholder?: string;
};

export default function ComposerEmojiPicker({
  onPick,
  searchPlaceholder,
}: ComposerEmojiPickerProps) {
  const [theme, setTheme] = useState(Theme.LIGHT);

  useEffect(() => {
    const sync = () => {
      setTheme(
        document.documentElement.classList.contains("dark")
          ? Theme.DARK
          : Theme.LIGHT,
      );
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <EmojiPicker
      width="100%"
      height={360}
      lazyLoadEmojis
      theme={theme}
      searchPlaceholder={searchPlaceholder}
      onEmojiClick={(emojiData) => onPick(emojiData.emoji)}
    />
  );
}
