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
      position={rtl ? "bottom-left" : "bottom-right"}
      gutter={12}
      containerClassName="vs-toast-host"
      containerStyle={{
        top: "auto",
        bottom: "max(6.5rem, calc(5.5rem + env(safe-area-inset-bottom, 0px)))",
        left: "max(1rem, env(safe-area-inset-left, 0px))",
        right: "max(1rem, env(safe-area-inset-right, 0px))",
      }}
      toastOptions={{
        className: "",
        style: { background: "transparent", boxShadow: "none", padding: 0, margin: 0 },
      }}
    />
  );
}
