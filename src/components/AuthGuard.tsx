"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  // 인증이 필요 없는 페이지들
  const publicPaths = ['/login', '/auth/callback'];
  const isPublicPath = publicPaths.some(path => pathname?.startsWith(path));

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session && !isPublicPath) {
          // 로그인되지 않았고, 공개 페이지가 아니면 로그인 페이지로
          router.push('/login');
        } else if (session && pathname === '/login') {
          // 이미 로그인되어 있는데 로그인 페이지 접근 시 메인으로
          router.push('/');
        }
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // 인증 상태 변경 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        router.push('/login');
      } else if (event === 'SIGNED_IN' && pathname === '/login') {
        router.push('/');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [pathname, router, isPublicPath]);

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
