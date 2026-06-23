declare module "*.css";

declare module "react-phone-number-input/style.css";

declare module "react-phone-number-input/flags" {
  import type { ComponentType } from "react";
  const flags: Record<
    string,
    ComponentType<{ country: string; title?: string; "aria-hidden"?: boolean }>
  >;
  export default flags;
}

interface Window {
  webkitAudioContext?: typeof AudioContext;
}
