"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { LogOut, Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import BrandMark from "@/components/brand/BrandMark";
import { cn } from "@/lib/classNames";
import {
  ORBIT_CX,
  ORBIT_CY,
  ORBIT_HUB_SIZE,
  ORBIT_NAV_R,
  ORBIT_NODE_SIZE,
  ORBIT_VIEW_H,
  ORBIT_VIEW_W,
  orbitAngleForHref,
  polarXY,
} from "@/lib/floatingNavLayout";
import { api } from "@/lib/api";
import { logout } from "@/store/slices/authSlice";
import {
  setFloatingNav,
  setFloatingNavOpen,
  setSidebarOpen,
  setTheme,
} from "@/store/slices/uiSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  isShellNavActive,
  shellAccountNav,
  shellMainNav,
  type ShellNavItem,
} from "@/lib/shellNav";
import { prefetchShellRoutes } from "@/lib/prefetchShellRoutes";
import { useShellNavBadges } from "@/hooks/useShellNavBadges";
import ShellNavBadge, { formatShellBadgeCount } from "@/components/layout/ShellNavBadge";

/** Symmetric padding so icon center stays on (x, y); labels overflow outside. */
const LABEL_OVERFLOW = 24;
const HUB_LABEL_SPACE = 24;
const LAUNCHER_SIZE = 56;
const LAUNCHER_MARGIN = 16;
const LAUNCHER_POS_KEY = "vegasphere-floating-nav-launcher";
const DRAG_CLICK_THRESHOLD = 6;

type LauncherPosition = { x: number; y: number };

function clampLauncherPosition(pos: LauncherPosition): LauncherPosition {
  if (typeof window === "undefined") return pos;
  const maxX = Math.max(LAUNCHER_MARGIN, window.innerWidth - LAUNCHER_SIZE - LAUNCHER_MARGIN);
  const maxY = Math.max(LAUNCHER_MARGIN, window.innerHeight - LAUNCHER_SIZE - LAUNCHER_MARGIN);
  return {
    x: Math.min(Math.max(LAUNCHER_MARGIN, pos.x), maxX),
    y: Math.min(Math.max(LAUNCHER_MARGIN, pos.y), maxY),
  };
}

function defaultLauncherPosition(rtl: boolean): LauncherPosition {
  if (typeof window === "undefined") {
    return { x: LAUNCHER_MARGIN, y: LAUNCHER_MARGIN };
  }
  return clampLauncherPosition({
    x: rtl
      ? LAUNCHER_MARGIN
      : window.innerWidth - LAUNCHER_SIZE - LAUNCHER_MARGIN,
    y: window.innerHeight - LAUNCHER_SIZE - LAUNCHER_MARGIN,
  });
}

function readStoredLauncherPosition(rtl: boolean): LauncherPosition {
  if (typeof window === "undefined") return defaultLauncherPosition(rtl);
  try {
    const raw = window.localStorage.getItem(LAUNCHER_POS_KEY);
    if (!raw) return defaultLauncherPosition(rtl);
    const parsed = JSON.parse(raw) as Partial<LauncherPosition>;
    if (typeof parsed.x !== "number" || typeof parsed.y !== "number") {
      return defaultLauncherPosition(rtl);
    }
    return clampLauncherPosition({ x: parsed.x, y: parsed.y });
  } catch {
    return defaultLauncherPosition(rtl);
  }
}

function persistLauncherPosition(pos: LauncherPosition) {
  try {
    window.localStorage.setItem(LAUNCHER_POS_KEY, JSON.stringify(pos));
  } catch {
    /* ignore storage failures */
  }
}

function findActiveItem(pathname: string): ShellNavItem | null {
  const all = [...shellMainNav, ...shellAccountNav];
  return all.find((item) => isShellNavActive(pathname, item.href)) ?? null;
}

type SvgOrbitButtonProps = {
  x: number;
  y: number;
  size: number;
  label: string;
  badgeCount?: number;
  active?: boolean;
  ghost?: boolean;
  enterDelay?: number;
  onClick: () => void;
  children: ReactNode;
};

function SvgOrbitButton({
  x,
  y,
  size,
  label,
  badgeCount = 0,
  active,
  ghost,
  enterDelay = 0,
  onClick,
  children,
}: SvgOrbitButtonProps) {
  const reduceMotion = useReducedMotion();
  const half = size / 2;
  const foSize = size + LABEL_OVERFLOW * 2;
  const badgeLabel = formatShellBadgeCount(badgeCount);

  return (
    <foreignObject
      x={x - half - LABEL_OVERFLOW}
      y={y - half - LABEL_OVERFLOW}
      width={foSize}
      height={foSize}
      className="overflow-visible"
    >
      <motion.div
        className="relative grid h-full w-full place-items-center overflow-visible"
        initial={reduceMotion ? false : { opacity: 0, scale: 0.72 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          delay: enterDelay,
          duration: 0.42,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        <motion.button
          type="button"
          aria-label={badgeLabel ? `${label} (${badgeLabel})` : label}
          onClick={onClick}
          initial="rest"
          whileHover="hover"
          whileTap={{ scale: 0.94 }}
          className={cn(
            "group relative z-10 grid place-items-center overflow-visible rounded-2xl border shadow-lg backdrop-blur-md outline-none",
            "focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2",
            active
              ? "border-brand-500/60 bg-brand-600 text-white shadow-[0_0_28px_rgb(var(--vega-brand)/0.38)] dark:border-brand-500/50 dark:bg-brand-700"
              : ghost
                ? "border-dashed border-brand-300/50 bg-brand-50/30 dark:border-brand-700/45 dark:bg-brand-900/15"
                : "border-brand-200/55 bg-surface/94 text-muted dark:border-white/12 dark:bg-black/78",
          )}
          style={{ width: size, height: size }}
          variants={{
            rest: { scale: 1 },
            hover: {
              scale: 1.1,
              transition: { type: "spring", stiffness: 460, damping: 20 },
            },
          }}
        >
          <motion.span
            className="grid place-items-center"
            variants={{
              rest: { scale: 1, rotate: 0 },
              hover: {
                scale: 1.08,
                rotate: ghost ? 0 : [0, -6, 6, 0],
                transition: { duration: 0.38 },
              },
            }}
          >
            {children}
          </motion.span>
          <ShellNavBadge
            count={badgeCount}
            compact
            className="absolute -end-1.5 -top-1.5 z-20"
          />

          {!ghost ? (
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-2xl bg-brand-400/0"
              variants={{
                rest: { opacity: 0 },
                hover: { opacity: 1 },
              }}
              style={{
                boxShadow: "0 0 22px rgb(var(--vega-brand) / 0.35)",
              }}
            />
          ) : null}

          <motion.span
            aria-hidden
            className={cn(
              "pointer-events-none absolute left-1/2 top-full z-30 whitespace-nowrap rounded-md border px-2 py-0.5 text-[9px] font-bold tracking-wide shadow-md backdrop-blur-md sm:text-[10px]",
              active
                ? "border-brand-400/50 bg-brand-600/95 text-white"
                : "border-brand-200/60 bg-surface/96 text-brand-800 dark:border-white/14 dark:bg-black/88 dark:text-brand-100",
            )}
            style={{ x: "-50%", transformOrigin: "50% 0%" }}
            variants={{
              rest: { opacity: 0, scale: 0.45, y: -10 },
              hover: {
                opacity: 1,
                scale: 1,
                y: 2,
                transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
              },
            }}
          >
            {label}
          </motion.span>
        </motion.button>
      </motion.div>
    </foreignObject>
  );
}

function OrbitInnerMotion({
  cx,
  cy,
  reduceMotion,
}: {
  cx: number;
  cy: number;
  reduceMotion: boolean | null;
}) {
  if (reduceMotion) {
    return (
      <>
        <circle
          cx={cx}
          cy={cy}
          r={88}
          fill="none"
          stroke="rgb(var(--vega-brand))"
          strokeOpacity={0.14}
          strokeWidth={1.25}
        />
        <circle
          cx={cx}
          cy={cy}
          r={112}
          fill="none"
          stroke="rgb(var(--vega-brand))"
          strokeOpacity={0.08}
          strokeWidth={1}
          strokeDasharray="6 12"
        />
      </>
    );
  }

  return (
    <>
      <motion.circle
        cx={cx}
        cy={cy}
        r={62}
        fill="rgb(var(--vega-brand))"
        animate={{
          r: [62, 98, 62],
          opacity: [0.04, 0.14, 0.04],
        }}
        transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.circle
        cx={cx}
        cy={cy}
        r={72}
        fill="none"
        stroke="rgb(var(--vega-brand))"
        strokeWidth={1.5}
        animate={{
          r: [72, 88, 72],
          strokeOpacity: [0.12, 0.42, 0.12],
        }}
        transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.circle
        cx={cx}
        cy={cy}
        r={92}
        fill="none"
        stroke="rgb(var(--vega-brand))"
        strokeWidth={1.25}
        animate={{
          r: [92, 108, 92],
          strokeOpacity: [0.08, 0.3, 0.08],
        }}
        transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      />
      <motion.circle
        cx={cx}
        cy={cy}
        r={118}
        fill="none"
        stroke="rgb(var(--vega-brand))"
        strokeWidth={1}
        animate={{
          r: [118, 132, 118],
          strokeOpacity: [0.05, 0.2, 0.05],
        }}
        transition={{ duration: 5.6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
      <motion.g
        transform={`translate(${cx} ${cy})`}
        animate={{ rotate: 360 }}
        transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
      >
        <circle
          cx={0}
          cy={0}
          r={78}
          fill="none"
          stroke="rgb(var(--vega-brand))"
          strokeOpacity={0.24}
          strokeWidth={1.25}
          strokeDasharray="8 16"
        />
      </motion.g>
      <motion.g
        transform={`translate(${cx} ${cy})`}
        animate={{ rotate: -360 }}
        transition={{ duration: 36, repeat: Infinity, ease: "linear" }}
      >
        <circle
          cx={0}
          cy={0}
          r={102}
          fill="none"
          stroke="rgb(var(--vega-brand))"
          strokeOpacity={0.16}
          strokeWidth={1}
          strokeDasharray="4 20"
        />
      </motion.g>
      <motion.g
        transform={`translate(${cx} ${cy})`}
        animate={{ rotate: 360 }}
        transition={{ duration: 48, repeat: Infinity, ease: "linear" }}
      >
        <circle
          cx={0}
          cy={0}
          r={124}
          fill="none"
          stroke="rgb(var(--vega-brand))"
          strokeOpacity={0.1}
          strokeWidth={0.75}
          strokeDasharray="2 24"
        />
      </motion.g>
      {[0, 60, 120, 180, 240, 300].map((angle, i) => {
        const rad = ((angle - 90) * Math.PI) / 180;
        const orbitR = 58;
        return (
          <motion.circle
            key={angle}
            cx={cx + orbitR * Math.cos(rad)}
            cy={cy + orbitR * Math.sin(rad)}
            r={3}
            fill="rgb(var(--vega-brand))"
            animate={{
              opacity: [0.12, 0.75, 0.12],
              r: [2.5, 4.5, 2.5],
            }}
            transition={{
              duration: 2.8,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.35,
            }}
          />
        );
      })}
    </>
  );
}

type SvgOrbitHubProps = {
  x: number;
  y: number;
  label: string;
  enterDelay?: number;
  onClick: () => void;
  children: ReactNode;
};

function SvgOrbitHub({
  x,
  y,
  label,
  enterDelay = 0,
  onClick,
  children,
}: SvgOrbitHubProps) {
  const reduceMotion = useReducedMotion();
  const half = ORBIT_HUB_SIZE / 2;
  const iconFoSize = ORBIT_HUB_SIZE + LABEL_OVERFLOW * 2;
  const labelFoW = 148;

  return (
    <>
      <foreignObject
        x={x - half - LABEL_OVERFLOW}
        y={y - half - LABEL_OVERFLOW}
        width={iconFoSize}
        height={iconFoSize}
        className="overflow-visible"
      >
        <motion.div
          dir="ltr"
          className="relative grid h-full w-full place-items-center overflow-visible"
          initial={reduceMotion ? false : { opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ transformOrigin: "center center" }}
          transition={{
            delay: enterDelay,
            duration: 0.48,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <motion.button
            type="button"
            aria-label={label}
            onClick={onClick}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            className={cn(
              "relative z-10 grid place-items-center overflow-visible rounded-2xl border border-brand-500/60 bg-brand-600 text-white shadow-[0_0_28px_rgb(var(--vega-brand)/0.38)] outline-none",
              "focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 dark:border-brand-500/50 dark:bg-brand-700",
            )}
            style={{ width: ORBIT_HUB_SIZE, height: ORBIT_HUB_SIZE }}
          >
            <motion.span
              className="grid place-items-center"
              animate={
                reduceMotion
                  ? undefined
                  : { y: [0, -3, 0], scale: [1, 1.04, 1] }
              }
              transition={{
                duration: 2.8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              {children}
            </motion.span>
            {!reduceMotion ? (
              <motion.span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-2xl"
                animate={{
                  boxShadow: [
                    "0 0 18px rgb(var(--vega-brand) / 0.25)",
                    "0 0 32px rgb(var(--vega-brand) / 0.45)",
                    "0 0 18px rgb(var(--vega-brand) / 0.25)",
                  ],
                }}
                transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
              />
            ) : null}
          </motion.button>
        </motion.div>
      </foreignObject>

      <foreignObject
        x={x - labelFoW / 2}
        y={y + half + 6}
        width={labelFoW}
        height={HUB_LABEL_SPACE}
        className="overflow-visible"
      >
        <motion.div
          key={label}
          className="flex h-full w-full items-start justify-center"
          initial={reduceMotion ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="max-w-full truncate text-center text-[11px] font-bold tracking-wide text-brand-700 dark:text-brand-200">
            {label}
          </span>
        </motion.div>
      </foreignObject>
    </>
  );
}

function FloatingNavUtilities() {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const theme = useAppSelector((s) => s.ui.theme);
  const user = useAppSelector((s) => s.auth.user);
  const rtl = i18n.dir() === "rtl";
  const isEnglish = !i18n.language?.startsWith("ar");
  const reduceMotion = useReducedMotion();

  const btnClass =
    "grid h-11 w-11 place-items-center rounded-xl border border-brand-200/55 bg-surface/92 text-muted shadow-sm backdrop-blur-md transition hover:scale-105 hover:border-brand-400/55 hover:text-brand-700 dark:border-white/12 dark:bg-black/75 dark:hover:text-brand-200";

  return (
    <div
      dir={rtl ? "rtl" : "ltr"}
      className="flex w-full flex-col items-center justify-center text-center"
    >
      <motion.div
        className="flex items-center justify-center gap-2.5 sm:gap-3"
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.32, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <button
          type="button"
          aria-label={t("language")}
          onClick={() => i18n.changeLanguage(isEnglish ? "ar" : "en")}
          className={btnClass}
        >
          <span className="text-xs font-extrabold">{isEnglish ? "EN" : "AR"}</span>
        </button>
        <button
          type="button"
          aria-label={t("themeToggle")}
          onClick={() => {
            const next = theme === "dark" ? "light" : "dark";
            try {
              localStorage.setItem("vegasphere-next-theme", next);
            } catch {}
            try {
              document.cookie = `vegasphere-next-theme=${encodeURIComponent(next)}; path=/; max-age=31536000; samesite=lax`;
            } catch {}
            dispatch(setTheme(next));
          }}
          className={btnClass}
        >
          {theme === "dark" ? (
            <Moon className="h-5 w-5" aria-hidden />
          ) : (
            <Sun className="h-5 w-5" aria-hidden />
          )}
        </button>
        {user?._id ? (
          <button
            type="button"
            aria-label={t("navLogout")}
            onClick={async () => {
              try {
                await api.delete("/auth/sessions/current");
              } catch {}
              dispatch(logout());
              dispatch(setFloatingNavOpen(false));
              router.push("/login");
            }}
            className={cn(
              btnClass,
              "text-red-500 hover:border-red-300/60 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300",
            )}
          >
            <LogOut className="h-5 w-5" aria-hidden />
          </button>
        ) : null}
      </motion.div>

      <motion.p
        className="mx-auto mt-5 max-w-xs px-2 text-center text-xs leading-relaxed text-muted sm:text-sm"
        initial={reduceMotion ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.42, duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      >
        {t("floatingNavPickHint")}
      </motion.p>
    </div>
  );
}

function FloatingNavOrbit({
  onPickNav,
}: {
  onPickNav: (_href: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const rtl = i18n.dir() === "rtl";
  const reduceMotion = useReducedMotion();
  const navBadges = useShellNavBadges();

  const activeItem = findActiveItem(pathname || "/");
  const allNav = [...shellMainNav, ...shellAccountNav];

  const handleCenterPick = () => {
    if (activeItem) onPickNav(activeItem.href);
    else dispatch(setFloatingNavOpen(false));
  };

  return (
    <div
      dir={rtl ? "rtl" : "ltr"}
      className="mx-auto flex w-full max-w-[min(92vw,26rem)] flex-col items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={t("floatingNavDialogLabel")}
    >
      <div className="relative mb-5 aspect-square w-full max-w-[min(92vw,22rem)] sm:mb-6 sm:max-w-[26rem]">
        <svg
          viewBox={`0 0 ${ORBIT_VIEW_W} ${ORBIT_VIEW_H}`}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 h-full w-full"
          aria-hidden={false}
        >
          <defs>
            <radialGradient id="vega-orbit-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgb(var(--vega-brand))" stopOpacity="0.2" />
              <stop offset="55%" stopColor="rgb(var(--vega-brand))" stopOpacity="0.08" />
              <stop offset="100%" stopColor="rgb(var(--vega-brand))" stopOpacity="0" />
            </radialGradient>
          </defs>

          <circle cx={ORBIT_CX} cy={ORBIT_CY} r={ORBIT_NAV_R + 12} fill="url(#vega-orbit-glow)" />
          <OrbitInnerMotion cx={ORBIT_CX} cy={ORBIT_CY} reduceMotion={reduceMotion} />
          <motion.circle
            cx={ORBIT_CX}
            cy={ORBIT_CY}
            r={ORBIT_NAV_R}
            fill="none"
            stroke="rgb(var(--vega-brand))"
            strokeOpacity="0.28"
            strokeWidth="1.25"
            strokeDasharray="6 8"
            initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          />

          {activeItem ? (
            <SvgOrbitHub
              x={ORBIT_CX}
              y={ORBIT_CY}
              label={t(activeItem.key)}
              enterDelay={0.12}
              onClick={handleCenterPick}
            >
              <activeItem.Icon className="h-8 w-8" aria-hidden />
            </SvgOrbitHub>
          ) : (
            <SvgOrbitHub
              x={ORBIT_CX}
              y={ORBIT_CY}
              label={t("navChats")}
              enterDelay={0.12}
              onClick={handleCenterPick}
            >
              <BrandMark variant="vega" className="h-9 w-9" />
            </SvgOrbitHub>
          )}

          {allNav.map((item, i) => {
            const isActive = item.href === activeItem?.href;
            const angle = orbitAngleForHref(item.href, rtl);
            const { x, y } = polarXY(angle, ORBIT_NAV_R);
            const Icon = item.Icon;
            return (
              <SvgOrbitButton
                key={item.href}
                x={x}
                y={y}
                size={ORBIT_NODE_SIZE}
                label={t(item.key)}
                badgeCount={navBadges[item.href] || 0}
                ghost={isActive}
                enterDelay={0.14 + i * 0.035}
                onClick={() => onPickNav(item.href)}
              >
                <Icon
                  className={cn(
                    "h-[1.15rem] w-[1.15rem]",
                    isActive && "opacity-45",
                  )}
                  aria-hidden
                />
              </SvgOrbitButton>
            );
          })}
        </svg>
      </div>

      <div className="flex w-full flex-col items-center">
        <FloatingNavUtilities />
      </div>
    </div>
  );
}

export function FloatingNavLauncher() {
  const dispatch = useAppDispatch();
  const floatingNav = useAppSelector((s) => s.ui.floatingNav);
  const floatingNavOpen = useAppSelector((s) => s.ui.floatingNavOpen);
  const navBadges = useShellNavBadges();
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === "rtl";
  const [position, setPosition] = useState<LauncherPosition>(() =>
    readStoredLauncherPosition(rtl),
  );
  const positionRef = useRef<LauncherPosition | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const totalBadgeCount =
    (navBadges["/chats"] || 0) +
    (navBadges["/notifications"] || 0) +
    (navBadges["/calls"] || 0) +
    (navBadges["/status"] || 0);

  const setLauncherPosition = useCallback((next: LauncherPosition) => {
    const clamped = clampLauncherPosition(next);
    positionRef.current = clamped;
    setPosition(clamped);
    return clamped;
  }, []);

  useEffect(() => {
    const initial = readStoredLauncherPosition(rtl);
    positionRef.current = initial;
    setPosition(initial);
  }, [rtl]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const onResize = () => {
      const current = positionRef.current || readStoredLauncherPosition(rtl);
      const clamped = setLauncherPosition(current);
      persistLauncherPosition(clamped);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [rtl, setLauncherPosition]);

  if (!floatingNav || floatingNavOpen) return null;

  return (
    <button
      type="button"
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        const current = positionRef.current || readStoredLauncherPosition(rtl);
        dragRef.current = {
          pointerId: event.pointerId,
          startClientX: event.clientX,
          startClientY: event.clientY,
          startX: current.x,
          startY: current.y,
          moved: false,
        };
        event.currentTarget.setPointerCapture?.(event.pointerId);
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        const dx = event.clientX - drag.startClientX;
        const dy = event.clientY - drag.startClientY;
        if (
          !drag.moved &&
          Math.hypot(dx, dy) >= DRAG_CLICK_THRESHOLD
        ) {
          drag.moved = true;
          suppressClickRef.current = true;
        }
        if (!drag.moved) return;
        setLauncherPosition({
          x: drag.startX + dx,
          y: drag.startY + dy,
        });
      }}
      onPointerUp={(event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        event.currentTarget.releasePointerCapture?.(event.pointerId);
        if (drag.moved && positionRef.current) {
          persistLauncherPosition(positionRef.current);
          window.setTimeout(() => {
            suppressClickRef.current = false;
          }, 0);
        }
        dragRef.current = null;
      }}
      onPointerCancel={() => {
        dragRef.current = null;
        window.setTimeout(() => {
          suppressClickRef.current = false;
        }, 0);
      }}
      onClick={() => {
        if (suppressClickRef.current) {
          suppressClickRef.current = false;
          return;
        }
        dispatch(setFloatingNavOpen(true));
      }}
      className={cn(
        "fixed z-50 grid h-14 w-14 touch-none select-none place-items-center rounded-full border border-brand-400/45 bg-surface/90 shadow-[0_8px_32px_rgb(var(--vega-brand)/0.28)] backdrop-blur-xl transition hover:scale-105 active:scale-95 dark:border-brand-600/40 dark:bg-black/80",
      )}
      style={
        position
          ? {
              left: position.x,
              top: position.y,
            }
          : undefined
      }
      aria-label={
        totalBadgeCount > 0
          ? `${t("floatingNavOpen")} (${formatShellBadgeCount(totalBadgeCount)})`
          : t("floatingNavOpen")
      }
      title={
        totalBadgeCount > 0
          ? `${t("floatingNavOpen")} (${formatShellBadgeCount(totalBadgeCount)})`
          : t("floatingNavOpen")
      }
    >
      <BrandMark variant="vega" className="h-9 w-9" />
      <ShellNavBadge
        count={totalBadgeCount}
        className="absolute -end-1 -top-1"
      />
    </button>
  );
}

export default function FloatingNavigation() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const floatingNav = useAppSelector((s) => s.ui.floatingNav);
  const floatingNavOpen = useAppSelector((s) => s.ui.floatingNavOpen);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!floatingNav || !floatingNavOpen) return;
    prefetchShellRoutes(router);
  }, [floatingNav, floatingNavOpen, router]);

  if (!floatingNav || !floatingNavOpen) return null;

  const onPickNav = (href: string) => {
    dispatch(setFloatingNavOpen(false));
    router.push(href);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6"
      aria-hidden={false}
    >
      <motion.div
        className="absolute inset-0 bg-canvas/78 backdrop-blur-md dark:bg-black/72"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.28 }}
      />

      <motion.div
        className="relative z-10 flex w-full max-w-xl flex-col items-center justify-center"
        initial={reduceMotion ? false : { opacity: 0, scale: 0.94, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      >
        <FloatingNavOrbit onPickNav={onPickNav} />
      </motion.div>
    </div>
  );
}

export function useFloatingNavMode() {
  const dispatch = useAppDispatch();
  const floatingNav = useAppSelector((s) => s.ui.floatingNav);

  const setEnabled = (enabled: boolean) => {
    dispatch(setFloatingNav(enabled));
    if (enabled) {
      dispatch(setSidebarOpen(false));
      dispatch(setFloatingNavOpen(true));
    } else {
      dispatch(setSidebarOpen(true));
      dispatch(setFloatingNavOpen(false));
    }
  };

  return { floatingNav, setEnabled };
}
