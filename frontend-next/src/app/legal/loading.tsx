import MarketingPageShell from "@/components/marketing/MarketingPageShell";
import VegaLoadingScreen from "@/components/marketing/VegaLoadingScreen";

/** Shown while /legal/* routes load (privacy, terms, contact). */
export default function LegalLoading() {
  return (
    <MarketingPageShell ambientIntensity="soft">
      <div className="relative z-10 flex flex-1 items-center justify-center">
        <VegaLoadingScreen fullScreen={false} className="min-h-[50vh]" />
      </div>
    </MarketingPageShell>
  );
}
