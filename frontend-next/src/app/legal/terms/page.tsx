import LegalTermsPage from "@/components/marketing/legal/LegalTermsPage";
import { getServerTranslator } from "@/i18n/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms and conditions for using Vegasphere.",
};

const SECTION_KEYS = [
  { titleKey: "termsUseTitle", bodyKey: "termsUseBody" },
  { titleKey: "termsAccountTitle", bodyKey: "termsAccountBody" },
  { titleKey: "termsAcceptableTitle", bodyKey: "termsAcceptableBody" },
  { titleKey: "termsContentTitle", bodyKey: "termsContentBody" },
  { titleKey: "termsTerminationTitle", bodyKey: "termsTerminationBody" },
  { titleKey: "termsLiabilityTitle", bodyKey: "termsLiabilityBody" },
] as const;

export default function TermsPage() {
  const t = getServerTranslator();

  const sections = SECTION_KEYS.map(({ titleKey, bodyKey }) => ({
    id: titleKey,
    title: t(titleKey),
    body: t(bodyKey),
  }));

  return (
    <LegalTermsPage
      title={t("termsTitle")}
      intro={t("termsIntro")}
      backLabel={t("back")}
      contentsLabel={t("legalContentsTitle")}
      sections={sections}
    />
  );
}
