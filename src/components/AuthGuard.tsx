"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Profile = {
  id: string;
  nickname: string | null;
  avatar_url: string | null;
};

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();

    // Auth 상태 변경 리스너
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAuth();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [pathname]);

  const checkAuth = async () => {
    try {
      // 로그인이 필요 없는 경로들
      const publicPaths = ['/login', '/auth/callback'];
      const isPublicPath = publicPaths.some(path => pathname?.startsWith(path));

      // 현재 세션 확인
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        // 로그인 안 됨
        setIsAuthenticated(false);
        if (!isPublicPath) {
          router.push('/login');
        }
        setIsChecking(false);
        return;
      }

      // 로그인 됨
      setIsAuthenticated(true);

      // 프로필 확인
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, nickname, avatar_url')
        .eq('id', session.user.id)
        .single();

      // 닉네임이 없으면 온보딩으로
      if (!profile?.nickname) {
        if (pathname !== '/onboarding') {
          router.push('/onboarding');
        }
        setIsChecking(false);
        return;
      }

      // 닉네임이 있는데 로그인/온보딩 페이지에 있으면 메인으로
      if (pathname === '/login' || pathname === '/onboarding') {
        router.push('/');
      }

      setIsChecking(false);
    } catch (error) {
      console.error('Auth check error:', error);
      setIsChecking(false);
    }
  };

  // 인증 체크 중이면 로딩 화면
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
