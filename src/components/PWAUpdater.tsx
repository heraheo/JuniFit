// @ts-nocheck
"use client";

import { useEffect } from "react";

const CHECK_INTERVAL_MS = 300;
const CONTROLLER_CHANGE_TIMEOUT_MS = 2000;

function waitForWorkbox(onReady: (wb: any) => void) {
  if (typeof window === "undefined") return () => undefined;

  let intervalId: number | null = null;
  let cleaned = false;

  const cleanup = () => {
    if (intervalId) {
      window.clearInterval(intervalId);
      intervalId = null;
    }
    cleaned = true;
  };

  const tryInit = () => {
    const wb = window.workbox;
    if (wb && typeof wb.addEventListener === "function") {
      cleanup();
      onReady(wb);
      return true;
    }
    return false;
  };

  if (!tryInit() && !cleaned) {
    intervalId = window.setInterval(() => {
      if (tryInit()) {
        cleanup();
      }
    }, CHECK_INTERVAL_MS);
  }

  return cleanup;
}

function usePWAUpdatePrompt() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    let unregister: (() => void) | undefined;

    unregister = waitForWorkbox((wb) => {
      const promptAndReload = () => {
        const shouldReload = window.confirm("새로운 버전이 있습니다. 업데이트할까요?");
        if (!shouldReload) return;

        const reload = () => window.location.reload();
        const listenForControllerChange = () => {
          if (!navigator?.serviceWorker) {
            reload();
            return;
          }
          let isReloaded = false;
          const controllerListener = () => {
            if (isReloaded) return;
            isReloaded = true;
            navigator.serviceWorker.removeEventListener("controllerchange", controllerListener);
            reload();
          };
          navigator.serviceWorker.addEventListener("controllerchange", controllerListener);
          window.setTimeout(() => {
            if (isReloaded) return;
            navigator.serviceWorker.removeEventListener("controllerchange", controllerListener);
            reload();
          }, CONTROLLER_CHANGE_TIMEOUT_MS);
        };

        listenForControllerChange();

        if (typeof wb.messageSkipWaiting === "function") {
          wb.messageSkipWaiting();
        } else if (wb.waiting) {
          wb.waiting.postMessage({ type: "SKIP_WAITING" });
        }
      };

      const handleWaiting = () => promptAndReload();
      const handleInstalled = (event: { isUpdate?: boolean }) => {
        if (event?.isUpdate) {
          promptAndReload();
        }
      };

      wb.addEventListener("waiting", handleWaiting);
      wb.addEventListener("installed", handleInstalled);

      unregister = () => {
        wb.removeEventListener("waiting", handleWaiting);
        wb.removeEventListener("installed", handleInstalled);
      };
    });

    return () => {
      if (typeof unregister === "function") {
        unregister();
      }
    };
  }, []);
}

export default function PWAUpdater() {
  usePWAUpdatePrompt();
  return null;
}
