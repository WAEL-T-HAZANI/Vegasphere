"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Toaster } from "react-hot-toast";
import { registerToastNavigation } from "@/lib/appToast";

import { getToastPosition } from "@/lib/toastShell";

export default function AppToaster() {
  const router = useRouter();
  const { i18n } = useTranslation();
  const rtl = i18n.dir() === "rtl";
  const position = getToastPosition(rtl);

  useEffect(() => {
    registerToastNavigation((conversationId) => {
      router.push(`/chats/${conversationId}`);
    });
    return () => registerToastNavigation(null);
  }, [router]);

  return (
    <Toaster
      key={rtl ? "rtl" : "ltr"}
      position={position}
      gutter={10}
      containerClassName="vs-toast-host"
      containerStyle={{
        top: "auto",
        bottom: "max(1rem, env(safe-area-inset-bottom, 0px))",
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
