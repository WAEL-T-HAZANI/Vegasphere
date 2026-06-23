"use client";

import { Fragment, useLayoutEffect, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

const VIRTUALIZE_MIN = 36;
const ESTIMATE_PX = 76;

export default function ChatListVirtualSection({
  conversations,
  renderRow,
  scrollElementRef,
}) {
  const enabled = conversations.length >= VIRTUALIZE_MIN;
  const [scrollReady, setScrollReady] = useState(false);

  useLayoutEffect(() => {
    if (!enabled) {
      setScrollReady(false);
      return undefined;
    }
    const el = scrollElementRef?.current;
    if (el) {
      setScrollReady(true);
      return undefined;
    }
    const timer = setInterval(() => {
      if (scrollElementRef?.current) {
        setScrollReady(true);
        clearInterval(timer);
      }
    }, 50);
    return () => clearInterval(timer);
  }, [enabled, scrollElementRef, conversations.length]);

  const virtualizer = useVirtualizer({
    count: conversations.length,
    getScrollElement: () => scrollElementRef?.current,
    estimateSize: () => ESTIMATE_PX,
    overscan: 6,
    enabled: enabled && scrollReady,
  });

  if (!enabled) {
    return conversations.map((c, idx) => (
      <Fragment key={String(c._id ?? idx)}>
        {renderRow(c, {
          suppressTopBorder: idx === 0,
        })}
      </Fragment>
    ));
  }

  return (
    <div
      style={{
        height: `${virtualizer.getTotalSize()}px`,
        width: "100%",
        position: "relative",
      }}
    >
      {virtualizer.getVirtualItems().map((virtualRow) => {
        const c = conversations[virtualRow.index];
        return (
          <div
            key={String(c._id)}
            data-index={virtualRow.index}
            ref={virtualizer.measureElement}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            {renderRow(c, {
              suppressTopBorder: virtualRow.index === 0,
            })}
          </div>
        );
      })}
    </div>
  );
}
