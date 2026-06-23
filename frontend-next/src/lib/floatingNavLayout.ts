import { shellAccountNav, shellMainNav } from "@/lib/shellNav";

const ALL_NAV = [...shellMainNav, ...shellAccountNav];

export const ORBIT_VIEW_W = 520;
export const ORBIT_VIEW_H = 520;
export const ORBIT_CX = 260;
/** Slightly above vertical center — leaves room above the utility row. */
export const ORBIT_CY = 284;
/** Ring radius — tab centers sit exactly on this circle. */
export const ORBIT_NAV_R = 178;
/** Orbit tab chip size in viewBox units (must match foreignObject width/height). */
export const ORBIT_NODE_SIZE = 42;
export const ORBIT_HUB_SIZE = 80;

const RING_STEP = 360 / ALL_NAV.length;
const NETWORKING_INDEX = ALL_NAV.findIndex((item) => item.href === "/networking");
/** Place networking (bottom tab) at 180° — straight above the toggle buttons. */
const RING_START =
  NETWORKING_INDEX >= 0
    ? (180 + RING_STEP * NETWORKING_INDEX) % 360
    : 270;

function buildAngleMap() {
  const map = new Map<string, number>();
  ALL_NAV.forEach((item, i) => {
    map.set(item.href, (RING_START - RING_STEP * i + 360) % 360);
  });
  return map;
}

export const ORBIT_ANGLE_BY_HREF = buildAngleMap();

export function orbitAngleForHref(href: string, rtl: boolean) {
  const base = ORBIT_ANGLE_BY_HREF.get(href) ?? 270;
  if (!rtl) return base;
  return (360 - base) % 360;
}

export function polarXY(
  angleDeg: number,
  radius: number,
  cx = ORBIT_CX,
  cy = ORBIT_CY,
) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}
