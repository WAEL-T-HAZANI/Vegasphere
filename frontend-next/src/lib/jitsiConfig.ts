// @ts-nocheck

export const JITSI_DOMAIN =
  process.env.NEXT_PUBLIC_JITSI_DOMAIN || "meet.jit.si";

const VEGASPHERE_THEME = {
  palette: {
    uiBackground: "#12080c",
    ui01: "#1a0f14",
    ui02: "#241018",
    ui03: "#3d1a28",
    ui04: "#8B1E3F",
    ui05: "#a82a60",
    action01: "#a82a60",
    action01Active: "#c43370",
    action01Hover: "#b83368",
    action02: "#8B1E3F",
    action02Active: "#a82a60",
    action02Hover: "#962550",
    action03: "#12080c",
    action03Hover: "#1a0f14",
    action03Active: "#241018",
    disabled01: "#4a2030",
    text01: "#ffffff",
    text02: "#f3e8ec",
    text03: "#d4a8b8",
    icon01: "#ffffff",
    icon02: "#f3e8ec",
    icon03: "#c43370",
    field01: "#1a0f14",
    field02: "#241018",
    success01: "#22c55e",
    warning01: "#f59e0b",
    danger01: "#ef4444",
  },
};

/** Brand-aligned Jitsi embed options (meet.jit.si supported overrides). */
export function buildJitsiEmbedOptions({
  roomName,
  displayName,
  email = "",
  audioOnly = false,
  container,
}) {
  return {
    roomName,
    parentNode: container,
    width: "100%",
    height: "100%",
    userInfo: {
      displayName: displayName || "Vegasphere user",
      email: email || undefined,
    },
    configOverwrite: {
      startWithAudioMuted: false,
      startWithVideoMuted: audioOnly,
      startAudioOnly: audioOnly,
      prejoinPageEnabled: false,
      prejoinConfig: {
        enabled: false,
      },
      enableWelcomePage: false,
      disableDeepLinking: true,
      hideConferenceSubject: true,
      disableModeratorIndicator: true,
      enableLobby: false,
      autoKnockLobby: true,
      requireDisplayName: false,
      enableInsecureRoomNameWarning: false,
      disableProfile: true,
      disableThirdPartyRequests: true,
      enableAnalytics: false,
      enableEmailInStats: false,
      disableRemoteMute: true,
      notifications: [],
      customTheme: VEGASPHERE_THEME,
      toolbarConfig: {
        alwaysVisible: true,
      },
    },
    interfaceConfigOverwrite: {
      APP_NAME: "Vegasphere",
      NATIVE_APP_NAME: "Vegasphere",
      PROVIDER_NAME: "Vegasphere",
      DEFAULT_BACKGROUND: "#12080c",
      DEFAULT_REMOTE_DISPLAY_NAME: "Guest",
      DEFAULT_LOCAL_DISPLAY_NAME: "You",
      DEFAULT_WELCOME_PAGE_LOGO_URL: " ",
      JITSI_WATERMARK_LINK: "",
      BRAND_WATERMARK_LINK: "",
      TOOLBAR_BUTTONS: [
        "microphone",
        "camera",
        "desktop",
        "fullscreen",
        "hangup",
        "tileview",
      ],
      SETTINGS_SECTIONS: ["devices", "language"],
      SHOW_JITSI_WATERMARK: false,
      SHOW_WATERMARK_FOR_GUESTS: false,
      SHOW_BRAND_WATERMARK: false,
      SHOW_POWERED_BY: false,
      SHOW_CHROME_EXTENSION_BANNER: false,
      MOBILE_APP_PROMO: false,
      HIDE_INVITE_MORE_HEADER: true,
      DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
      DISABLE_FOCUS_INDICATOR: true,
      DISABLE_DOMINANT_SPEAKER_INDICATOR: true,
      VIDEO_LAYOUT_FIT: "height",
      TOOLBAR_ALWAYS_VISIBLE: true,
      ENFORCE_NOTIFICATION_AUTO_DISMISS_TIMEOUT: 5000,
    },
  };
}

export function wireJitsiCallApi(api, { displayName, audioOnly }) {
  if (!api) return;

  const name = String(displayName || "Vegasphere user").trim();
  if (name) {
    try {
      api.executeCommand("displayName", name);
    } catch {
      /* ignore */
    }
  }

  try {
    api.executeCommand("subject", "Vegasphere");
  } catch {
    /* ignore */
  }

  if (audioOnly) {
    try {
      api.isAudioMuted?.().then((muted) => {
        if (!muted) api.executeCommand("toggleAudio");
      });
    } catch {
      /* ignore */
    }
  }

  try {
    api.executeCommand("toggleLobby", false);
  } catch {
    /* ignore */
  }
}

let loadPromise = null;

export function prefetchJitsiExternalApi() {
  if (typeof window === "undefined") return;
  loadJitsiExternalApi().catch(() => {});
}

export function loadJitsiExternalApi() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Jitsi is browser-only"));
  }
  if (window.JitsiMeetExternalAPI) {
    return Promise.resolve(window.JitsiMeetExternalAPI);
  }
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const finish = (fn) => {
      loadPromise = null;
      fn();
    };

    const existing = document.querySelector('script[data-vega-jitsi="1"]');
    if (existing) {
      if (window.JitsiMeetExternalAPI) {
        resolve(window.JitsiMeetExternalAPI);
        return;
      }
      existing.addEventListener("load", () => {
        if (window.JitsiMeetExternalAPI) resolve(window.JitsiMeetExternalAPI);
        else finish(() => reject(new Error("Jitsi API missing after load")));
      });
      existing.addEventListener("error", () =>
        finish(() => reject(new Error("Jitsi script failed to load"))),
      );
      return;
    }

    const script = document.createElement("script");
    script.src = `https://${JITSI_DOMAIN}/external_api.js`;
    script.async = true;
    script.dataset.vegaJitsi = "1";
    script.onload = () => {
      if (window.JitsiMeetExternalAPI) resolve(window.JitsiMeetExternalAPI);
      else finish(() => reject(new Error("Jitsi API missing after load")));
    };
    script.onerror = () =>
      finish(() => reject(new Error("Jitsi script failed to load")));
    document.head.appendChild(script);
  });

  return loadPromise;
}
