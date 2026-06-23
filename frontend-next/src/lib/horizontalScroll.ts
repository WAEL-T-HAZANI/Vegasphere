/** Chrome/Safari vs Firefox use different scrollLeft models in RTL. */
export function detectRtlScrollType(node: HTMLElement | null) {
  if (!node) return "default";
  const saved = node.scrollLeft;
  node.scrollLeft = 1;
  const one = node.scrollLeft;
  node.scrollLeft = 2;
  const two = node.scrollLeft;
  node.scrollLeft = saved;
  if (one === 0 && two === 0) return "reverse";
  if (one === 0 && two === 1) return "default";
  return "negative";
}

export function readHorizontalScrollProgress(
  el: HTMLElement,
  rtlType = "ltr",
) {
  const maxScroll = el.scrollWidth - el.clientWidth;
  if (maxScroll <= 0) return { maxScroll: 0, progress: 0, scrollable: false };

  const isRtl = getComputedStyle(el).direction === "rtl";
  let progress = 0;

  if (!isRtl) {
    progress = el.scrollLeft / maxScroll;
  } else if (rtlType === "negative") {
    progress = Math.abs(el.scrollLeft) / maxScroll;
  } else if (rtlType === "reverse") {
    progress = (maxScroll - el.scrollLeft) / maxScroll;
  } else {
    progress = el.scrollLeft / maxScroll;
  }

  return {
    maxScroll,
    progress: Math.min(1, Math.max(0, progress)),
    scrollable: true,
  };
}

export function writeHorizontalScrollProgress(
  el: HTMLElement,
  progress: number,
  rtlType = "ltr",
) {
  const maxScroll = el.scrollWidth - el.clientWidth;
  if (maxScroll <= 0) return;
  const clamped = Math.min(1, Math.max(0, progress));
  const isRtl = getComputedStyle(el).direction === "rtl";

  if (!isRtl) {
    el.scrollLeft = clamped * maxScroll;
    return;
  }

  if (rtlType === "negative") {
    el.scrollLeft = -clamped * maxScroll;
    return;
  }

  if (rtlType === "reverse") {
    el.scrollLeft = maxScroll - clamped * maxScroll;
    return;
  }

  el.scrollLeft = clamped * maxScroll;
}
