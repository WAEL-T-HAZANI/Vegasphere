export const LANDING_PANELS = [
  { id: "home", labelKey: "landingPanelHome" },
  { id: "features", labelKey: "landingPanelPlatform" },
  {
    id: "privacy",
    labelKey: "landingPanelPrivacy",
    shortLabelKey: "landingPanelPrivacyShort",
  },
  {
    id: "start",
    labelKey: "landingPanelStart",
    shortLabelKey: "landingPanelStartShort",
  },
] as const;

export const PANEL_EASE = [0.22, 1, 0.36, 1] as const;
