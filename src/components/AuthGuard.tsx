"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const AUTH_TIMEOUT_MS = 7000;

function withTimeout<T>(promise: Promise<T> | PromiseLike<T>, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timeout`));
    }, AUTH_TIMEOUT_MS);

    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const supabase = createClient();

  const isCheckingRef = useRef(false);
  const isMountedRef = useRef(true);
  const initialEventHandledRef = useRef(false);
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
      isMountedRef.current = false;
    };
  }, [addDebug]);

  const finishCheck = useCallback(() => {
    isCheckingRef.current = false;
    if (isMountedRef.current) {
      setIsLoading(false);
    }
  }, []);

  const checkAuth = useCallback(async () => {
    if (isCheckingRef.current) {
      addDebug("이미 체크 중 - 스킵");
      return;
    }

    isCheckingRef.current = true;
    if (isMountedRef.current) {
      setAuthError(null);
    }
    addDebug(`시작 - 경로: ${pathname}`);

    try {
      const isAuthCallback = pathname?.startsWith("/auth/callback");
      const isLoginPath = pathname === "/login";
      const isOnboardingPath = pathname === "/onboarding";

      if (isAuthCallback) {
        addDebug("콜백 페이지 - 로딩 종료");
        finishCheck();
        return;
      }

      addDebug(`네트워크: online=${typeof navigator !== "undefined" ? String(navigator.onLine) : "unknown"}`);

      addDebug("세션 확인 중...");
      const sessionStart = performance.now();
      const sessionResponse = await withTimeout(supabase.auth.getSession(), "세션 확인");
      addDebug(`세션 확인 완료 (${Math.round(performance.now() - sessionStart)}ms)`);

      const { data: { session }, error: sessionError } = sessionResponse;

      if (sessionError) {
        addDebug(`세션 에러: ${sessionError.message}`);
        throw sessionError;
      }

      addDebug(session ? `세션 있음 (ID: ${session.user.id.slice(0, 8)} exp=${session.expires_at ?? "none"})` : "세션 없음");

      if (!session) {
        if (!isLoginPath) {
          addDebug("/login으로 이동");
          router.push("/login");
        } else {
          addDebug("이미 로그인 페이지");
        }
        finishCheck();
        return;
      }

      addDebug("프로필 조회 시작");
      const profileQuery = supabase
        .from("profiles")
        .select("nickname")
        .eq("id", session.user.id)
        .maybeSingle();
      
      const profileStart = performance.now();
      const profileResponse = await withTimeout(
        profileQuery,
        "프로필 조회"
      );
      addDebug(`프로필 조회 완료 (${Math.round(performance.now() - profileStart)}ms)`);

      const { data: profile, error: profileError } = profileResponse;

      if (profileError) {
        addDebug(`프로필 에러: ${profileError.message}`);
        throw profileError;
      }

      const hasNickname = Boolean(profile?.nickname && profile.nickname.trim() !== "");
      addDebug(`닉네임 체크: ${hasNickname} (값: ${profile?.nickname || "null"})`);

      if (!hasNickname) {
        if (!isOnboardingPath) {
          addDebug("/onboarding으로 이동");
          router.push("/onboarding");
        } else {
          addDebug("이미 온보딩 페이지");
        }
        finishCheck();
        return;
      }

      if (isLoginPath || isOnboardingPath) {
        addDebug("메인으로 이동");
        router.push("/");
      }

      addDebug("로딩 종료");
      finishCheck();
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      addDebug(`예외: ${errMsg}`);
      if (isMountedRef.current) {
        setAuthError(errMsg.includes("timeout") ? "서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요." : errMsg);
      }
      finishCheck();
    }
  }, [addDebug, finishCheck, pathname, router, supabase]);

  const handleRetry = useCallback(() => {
    if (isCheckingRef.current) return;
    addDebug("재시도 클릭");
    setAuthError(null);
    setIsLoading(true);
    checkAuth();
  }, [addDebug, checkAuth]);

  useEffect(() => {
    initialEventHandledRef.current = false;
    logEnvInfo();
    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!initialEventHandledRef.current && event === "SIGNED_IN") {
        initialEventHandledRef.current = true;
        addDebug("초기 SIGNED_IN 이벤트 무시");
        return;
      }

      addDebug(`인증 이벤트: ${event}`);
      addDebug(
        `세션 이벤트: ${session ? `user=${session.user.id.slice(0, 8)} exp=${session.expires_at ?? "none"}` : "none"}`
      );

      if (event === "SIGNED_OUT") {
        if (isMountedRef.current) {
          setAuthError(null);
          setIsLoading(false);
        }
        router.push("/login");
        return;
      }

      if (["SIGNED_IN", "TOKEN_REFRESHED", "USER_UPDATED"].includes(event)) {
        checkAuth();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [addDebug, checkAuth, logEnvInfo, router, supabase]);

  if (isLoading) {
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
              <p key={i} className="text-slate-600 font-mono">{info}</p>
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
              <p key={i} className="text-slate-600 font-mono">{info}</p>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
