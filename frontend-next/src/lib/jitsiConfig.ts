// @ts-nocheck

export const JITSI_DOMAIN =
  process.env.NEXT_PUBLIC_JITSI_DOMAIN || "meet.jit.si";

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
      enableWelcomePage: false,
      disableDeepLinking: true,
      hideConferenceSubject: true,
      disableModeratorIndicator: true,
      backgroundAlpha: 0.55,
      disableThirdPartyRequests: true,
      enableAnalytics: false,
      notifications: [],
      toolbarConfig: {
        alwaysVisible: true,
      },
    },
    interfaceConfigOverwrite: {
      APP_NAME: "Vegasphere",
      DEFAULT_BACKGROUND: "#12080c",
      DEFAULT_REMOTE_DISPLAY_NAME: "Guest",
      TOOLBAR_BUTTONS: [
        "microphone",
        "camera",
        "desktop",
        "fullscreen",
        "hangup",
        "settings",
        "tileview",
      ],
      SETTINGS_SECTIONS: ["devices", "language"],
      SHOW_JITSI_WATERMARK: false,
      SHOW_WATERMARK_FOR_GUESTS: false,
      SHOW_BRAND_WATERMARK: false,
      SHOW_POWERED_BY: false,
      MOBILE_APP_PROMO: false,
      DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
      VIDEO_LAYOUT_FIT: "height",
      TOOLBAR_ALWAYS_VISIBLE: true,
      HIDE_INVITE_MORE_HEADER: true,
    },
  };
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
