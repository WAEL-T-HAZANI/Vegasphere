import LegalContactPage from "@/components/marketing/legal/LegalContactPage";
import { getServerTranslator } from "@/i18n/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with the Vegasphere team.",
};

export default function ContactPage() {
  const t = getServerTranslator();

  return (
    <LegalContactPage
      title={t("contactTitle")}
      intro={t("contactIntro")}
      backLabel={t("back")}
      emailCta={t("contactEmailTitle")}
      privacyLabel={t("homeFooterPrivacy")}
      cards={[
        {
          title: t("contactEmailTitle"),
          body: t("contactEmailBody"),
          icon: "mail",
        },
        {
          title: t("contactResponseTitle"),
          body: t("contactResponseBody"),
          icon: "clock",
        },
        {
          title: t("contactAddressTitle"),
          body: t("contactAddressBody"),
          icon: "map",
        },
      ]}
    />
  );
}
