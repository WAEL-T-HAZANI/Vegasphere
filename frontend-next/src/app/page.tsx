import dynamic from "next/dynamic";
import VegaLoadingScreen from "@/components/marketing/VegaLoadingScreen";

const LandingExperience = dynamic(
  () => import("@/components/marketing/LandingExperience"),
  { loading: () => <VegaLoadingScreen />, ssr: false },
);

export default function RootPage() {
  return <LandingExperience />;
}
