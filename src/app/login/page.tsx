"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    // 이미 로그인된 상태면 메인으로 리다이렉트
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push('/');
      }
    };
    checkAuth();
  }, [router]);

  const handleKakaoLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        // 이메일 수집 동의 없이 로그인 (닉네임, 프로필 사진만 사용)
        queryParams: {
          prompt: 'login',
        },
      },
    });

    if (error) {
      console.error('Kakao login error:', error);
      alert('로그인 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-slate-800 mb-4">JuniFit</h1>
        <p className="text-lg text-slate-600">나만의 운동 루틴, 지금 시작하세요</p>
      </div>

      <button
        onClick={handleKakaoLogin}
        className="flex items-center justify-center gap-3 bg-[#FEE500] text-black px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all hover:scale-105"
      >
        <MessageCircle className="w-6 h-6" fill="currentColor" />
        카카오로 3초 만에 시작하기
      </button>

      <div className="mt-8 text-center">
        <p className="text-sm text-slate-500">
          회원가입 시 <a href="#" className="text-blue-600 underline">이용약관</a> 및{" "}
          <a href="#" className="text-blue-600 underline">개인정보처리방침</a>에 동의하게 됩니다.
        </p>
      </div>
    </div>
  );
}
