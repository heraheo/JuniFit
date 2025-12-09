"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const supabase = createClient();

  const addDebug = (msg: string) => {
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      addDebug(`시작 - 경로: ${pathname}`);
      
      try {
        // 공개 페이지 체크
        const publicPaths = ['/login', '/auth/callback'];
        const isPublicPath = publicPaths.some(path => pathname?.startsWith(path));
        const isOnboardingPath = pathname === '/onboarding';

        // 공개 페이지는 바로 로딩 종료
        if (isPublicPath) {
          addDebug('공개 페이지 - 로딩 종료');
          if (isMounted) setIsLoading(false);
          return;
        }

        // 1. 세션 확인
        addDebug('세션 확인 중...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          addDebug(`세션 오류: ${sessionError.message}`);
          if (isMounted) setIsLoading(false);
          return;
        }

        addDebug(session ? '세션 있음' : '세션 없음');
        
        // 2. 비로그인 상태 처리
        if (!session) {
          addDebug('/login으로 이동');
          router.push('/login');
          if (isMounted) setIsLoading(false);
          return;
        }

        // 3. 로그인 상태 - 프로필 확인
        addDebug(`프로필 조회 중... userId: ${session.user.id.slice(0, 8)}`);
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('nickname')
          .eq('id', session.user.id)
          .maybeSingle();

        addDebug(`프로필 결과: ${profile ? JSON.stringify(profile) : 'null'}`);
        
        if (profileError) {
          addDebug(`프로필 오류: ${profileError.message}`);
          if (isMounted) setIsLoading(false);
          return;
        }

        const hasNickname = profile?.nickname && profile.nickname.trim() !== '';
        addDebug(`닉네임 있음: ${hasNickname}`);

        // 4. 닉네임이 없는 경우 (미완료 유저)
        if (!hasNickname) {
          if (!isOnboardingPath) {
            addDebug('/onboarding으로 이동');
            router.push('/onboarding');
          } else {
            addDebug('이미 온보딩 페이지');
          }
          if (isMounted) setIsLoading(false);
          return;
        }

        // 5. 닉네임이 있는 경우 (완료된 유저)
        if (pathname === '/login' || pathname === '/onboarding') {
          addDebug('메인으로 이동');
          router.push('/');
        }

        addDebug('로딩 종료');
        if (isMounted) setIsLoading(false);
        
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        addDebug(`예외: ${errMsg}`);
        if (isMounted) setIsLoading(false);
      }
    };

    checkAuth();

    // 인증 상태 변경 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      addDebug(`인증 이벤트: ${event}`);
      
      if (event === 'SIGNED_OUT') {
        router.push('/login');
      } else if (event === 'SIGNED_IN') {
        if (session) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('nickname')
            .eq('id', session.user.id)
            .maybeSingle();

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
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  // 로딩 중 화면 (디버그 정보 포함)
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="text-center mb-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">로딩 중...</p>
        </div>
        
        {/* 디버그 정보 */}
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

  return <>{children}</>;
}
