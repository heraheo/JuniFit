"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthProfile } from "@/hooks/useAuthProfile";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, loading, error, refresh } = useAuthProfile();
  const [authError, setAuthError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const envInfoLoggedRef = useRef(false);

  const addDebug = useCallback((msg: string) => {
    setDebugInfo((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  }, []);

  const logEnvInfo = useCallback(() => {
    if (envInfoLoggedRef.current) return;
    envInfoLoggedRef.current = true;

    addDebug(`환경: ua=${typeof navigator !== "undefined" ? navigator.userAgent : "unknown"}`);
    addDebug(`환경: online=${typeof navigator !== "undefined" ? String(navigator.onLine) : "unknown"}`);
    addDebug(`환경: sw=${typeof navigator !== "undefined" && "serviceWorker" in navigator ? "supported" : "none"}`);
    addDebug(`환경: visibility=${typeof document !== "undefined" ? document.visibilityState : "unknown"}`);
    addDebug(`환경: location=${typeof window !== "undefined" ? window.location.pathname : "unknown"}`);
  }, [addDebug]);

  useEffect(() => {
    const handleOnline = () => addDebug("네트워크: online 이벤트");
    const handleOffline = () => addDebug("네트워크: offline 이벤트");
    const handleVisibility = () => addDebug(`가시성 변경: ${document.visibilityState}`);

    if (typeof window !== "undefined") {
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
    }

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibility);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      }

      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibility);
      }
    };
  }, [addDebug]);

  useEffect(() => {
    logEnvInfo();
  }, [logEnvInfo]);

  useEffect(() => {
    if (!error) {
      setAuthError(null);
      return;
    }

    const errMsg = error instanceof Error ? error.message : String(error);
    setAuthError(
      errMsg.includes("timeout")
        ? "서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요."
        : errMsg
    );
  }, [error]);

  useEffect(() => {
    const userLabel = user ? user.id.slice(0, 8) : "none";
    const nickname = profile?.nickname ?? "none";
    addDebug(`상태: loading=${loading} user=${userLabel} nickname=${nickname}`);

    if (loading) return;

    const isLoginPath = pathname === "/login";
    const isOnboardingPath = pathname === "/onboarding";

    if (!user) {
      if (!isLoginPath) {
        addDebug("/login으로 이동");
        router.push("/login");
      } else {
        addDebug("이미 로그인 페이지");
      }
      return;
    }

    const hasNickname = Boolean(profile?.nickname && profile.nickname.trim() !== "");
    addDebug(`닉네임 체크: ${hasNickname}`);

    if (!hasNickname) {
      if (!isOnboardingPath) {
        addDebug("/onboarding으로 이동");
        router.push("/onboarding");
      } else {
        addDebug("이미 온보딩 페이지");
      }
      return;
    }

    if (isLoginPath || isOnboardingPath) {
      addDebug("메인으로 이동");
      router.push("/");
    }
  }, [addDebug, loading, pathname, profile, router, user]);

  const handleRetry = useCallback(() => {
    addDebug("재시도 클릭");
    setAuthError(null);
    refresh();
  }, [addDebug, refresh]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="text-center mb-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">로딩 중...</p>
        </div>

        <div className="w-full max-w-md bg-white rounded-lg shadow p-4 text-xs">
          <p className="font-bold mb-2 text-slate-700">디버그 로그:</p>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {debugInfo.map((info, i) => (
              <p key={i} className="text-slate-600 font-mono">
                {info}
              </p>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6 text-center space-y-4">
          <div>
            <p className="text-lg font-semibold text-slate-800 mb-1">연결에 문제가 있습니다</p>
            <p className="text-sm text-slate-600">{authError}</p>
          </div>
          <button
            onClick={handleRetry}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors"
          >
            다시 시도
          </button>
        </div>

        <div className="w-full max-w-md bg-white rounded-lg shadow p-4 text-xs mt-6">
          <p className="font-bold mb-2 text-slate-700">디버그 로그:</p>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {debugInfo.map((info, i) => (
              <p key={i} className="text-slate-600 font-mono">
                {info}
              </p>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
