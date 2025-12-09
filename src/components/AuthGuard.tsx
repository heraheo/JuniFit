"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // 공개 페이지 체크
        const publicPaths = ['/login', '/auth/callback'];
        const isPublicPath = publicPaths.some(path => pathname?.startsWith(path));
        const isOnboardingPath = pathname === '/onboarding';

        // 1. 세션 확인
        const { data: { session } } = await supabase.auth.getSession();
        
        // 2. 비로그인 상태 처리
        if (!session) {
          if (!isPublicPath) {
            router.push('/login');
          }
          setIsLoading(false);
          return;
        }

        // 3. 로그인 상태 - 프로필 확인
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('nickname')
          .eq('id', session.user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('프로필 조회 오류:', profileError);
        }

        const hasNickname = profile?.nickname && profile.nickname.trim() !== '';

        // 4. 닉네임이 없는 경우 (미완료 유저)
        if (!hasNickname) {
          if (!isOnboardingPath) {
            router.push('/onboarding');
          }
          setIsLoading(false);
          return;
        }

        // 5. 닉네임이 있는 경우 (완료된 유저)
        if (hasNickname && (pathname === '/login' || pathname === '/onboarding')) {
          router.push('/');
        }

        setIsLoading(false);
        
      } catch (error) {
        console.error('인증 확인 오류:', error);
        setIsLoading(false);
      }
    };

    checkAuth();

    // 인증 상태 변경 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        router.push('/login');
      } else if (event === 'SIGNED_IN') {
        if (session) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('nickname')
            .eq('id', session.user.id)
            .single();

          const hasNickname = profile?.nickname && profile.nickname.trim() !== '';
          
          if (!hasNickname) {
            router.push('/onboarding');
          } else if (pathname === '/login' || pathname === '/onboarding') {
            router.push('/');
          }
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [pathname, router, supabase]);

  // 로딩 중 화면
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
