"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Toaster } from "react-hot-toast";
import { registerToastNavigation } from "@/lib/appToast";

export default function AppToaster() {
  const router = useRouter();
  const { i18n } = useTranslation();
  const rtl = i18n.dir() === "rtl";

  useEffect(() => {
    registerToastNavigation((conversationId) => {
      router.push(`/chats/${conversationId}`);
    });
    return () => registerToastNavigation(null);
  }, [router]);

  return (
    <Toaster
      key={rtl ? "rtl" : "ltr"}
      position={rtl ? "top-left" : "top-right"}
      gutter={10}
      containerClassName="vs-toast-host"
      containerStyle={{
        top: "max(1rem, env(safe-area-inset-top, 0px))",
        bottom: "auto",
        left: rtl ? "max(1rem, env(safe-area-inset-left, 0px))" : "auto",
        right: rtl ? "auto" : "max(1rem, env(safe-area-inset-right, 0px))",
      }}
      toastOptions={{
        className: "",
        style: { background: "transparent", boxShadow: "none", padding: 0, margin: 0 },
      }}
    />
  );
}
