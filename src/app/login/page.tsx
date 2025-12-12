"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";

function LoginContent() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    // URL에서 에러 메시지 확인
    const error = searchParams.get('error');
    if (error) {
      setErrorMessage(decodeURIComponent(error));
    }
  }, [searchParams]);

  const handleKakaoLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setErrorMessage(`로그인 오류: ${error.message}`);
        setIsLoading(false);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : '알 수 없는 오류';
      setErrorMessage(`예상치 못한 오류: ${msg}`);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white px-4">
      <div className="max-w-md w-full">
        {/* 로고 및 타이틀 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">JuniFit</h1>
          <p className="text-slate-600">나만의 운동 루틴을 기록하세요</p>
        </div>

        {/* 에러 메시지 표시 */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-800 text-sm font-medium mb-1">⚠️ 오류 발생</p>
            <p className="text-red-700 text-xs break-all">{errorMessage}</p>
          </div>
        )}

        {/* 카카오 로그인 버튼 */}
        <Button
          onClick={handleKakaoLogin}
          isLoading={isLoading}
          fullWidth
          size="lg"
          className="bg-[#FEE500] hover:bg-[#FDD835] text-[#000000] shadow-lg hover:shadow-xl"
        >
          {!isLoading && (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 0C4.477 0 0 3.86 0 8.617c0 2.873 1.568 5.428 3.996 6.963-.166.607-.999 3.582-1.04 3.818 0 0-.027.218.114.3.141.083.31.012.31.012.403-.056 4.676-3.058 5.423-3.596.397.055.803.096 1.217.096 5.523 0 10-3.86 10-8.617C20 3.86 15.523 0 10 0z" fill="#000000"/>
            </svg>
          )}
          <span>카카오로 시작하기</span>
        </Button>

        {/* 추가 정보 */}
        <p className="text-center text-sm text-slate-500 mt-8">
          로그인하면 JuniFit의{" "}
          <a href="#" className="text-blue-600 hover:underline">
            서비스 약관
          </a>
          에 동의하게 됩니다.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">로딩 중...</p>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
