import LegalPrivacyPage from "@/components/marketing/legal/LegalPrivacyPage";
import { getServerTranslator } from "@/i18n/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Vegasphere collects, uses, and protects your data.",
};

const SECTION_KEYS = [
  { titleKey: "privacyCollectTitle", bodyKey: "privacyCollectBody" },
  { titleKey: "privacyUseTitle", bodyKey: "privacyUseBody" },
  { titleKey: "privacyShareTitle", bodyKey: "privacyShareBody" },
  { titleKey: "privacySecurityTitle", bodyKey: "privacySecurityBody" },
  { titleKey: "privacyChoicesTitle", bodyKey: "privacyChoicesBody" },
  { titleKey: "privacyChangesTitle", bodyKey: "privacyChangesBody" },
] as const;

export default function PrivacyPage() {
  const t = getServerTranslator();

  const sections = SECTION_KEYS.map(({ titleKey, bodyKey }) => ({
    id: titleKey,
    title: t(titleKey),
    body: t(bodyKey),
  }));

  return (
    <LegalPrivacyPage
      title={t("privacyTitle")}
      intro={t("privacyIntro")}
      backLabel={t("back")}
      sections={sections}
    />
  );
}
