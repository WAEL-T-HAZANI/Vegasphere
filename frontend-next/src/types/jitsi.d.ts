export {};

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (
      domain: string,
      options: Record<string, unknown>,
    ) => {
      dispose: () => void;
      addListener: (event: string, handler: () => void) => void;
    };
  }
}
