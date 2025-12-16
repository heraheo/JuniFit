// @ts-nocheck
"use client";

import { useEffect } from "react";

function usePWAUpdatePrompt() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const wb = window.workbox;
    if (!wb || typeof wb.addEventListener !== "function") return;

    const askToRefresh = () => {
      const shouldReload = window.confirm("새로운 버전이 있습니다. 업데이트할까요?");
      if (shouldReload) {
        if (typeof wb.messageSkipWaiting === "function") {
          wb.messageSkipWaiting();
        }
        window.location.reload();
      }
    };

    const handleWaiting = () => askToRefresh();
    const handleInstalled = (event: { isUpdate?: boolean }) => {
      if (event?.isUpdate) {
        askToRefresh();
      }
    };

    wb.addEventListener("waiting", handleWaiting);
    wb.addEventListener("installed", handleInstalled);

    return () => {
      wb.removeEventListener("waiting", handleWaiting);
      wb.removeEventListener("installed", handleInstalled);
    };
  }, []);
}

export default function PWAUpdater() {
  usePWAUpdatePrompt();
  return null;
}
