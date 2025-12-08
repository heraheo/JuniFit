"use client";

import "./globals.css";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabase";

type Profile = {
  nickname: string | null;
  avatar_url: string | null;
};

function LayoutContent({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 헤더를 표시하지 않을 경로들
  const noHeaderPaths = ['/login', '/onboarding', '/auth/callback'];
  const showHeader = !noHeaderPaths.some(path => pathname?.startsWith(path));

  useEffect(() => {
    loadProfile();
  }, [pathname]);

  const loadProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setProfile(null);
        setIsLoading(false);
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('nickname, avatar_url')
        .eq('id', session.user.id)
        .single();

      setProfile(data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading profile:', error);
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    const confirmed = window.confirm('로그아웃 하시겠습니까?');
    if (!confirmed) return;

    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="w-full max-w-md mx-auto min-h-screen">
      {showHeader && profile && !isLoading && (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="px-4 py-3 flex items-center justify-between">
            <h1 className="text-lg font-bold text-slate-800">JuniFit</h1>
            <div className="flex items-center gap-3">
              {/* 아바타 */}
              {profile.avatar_url && (
                <img
                  src={profile.avatar_url}
                  alt={profile.nickname || "Avatar"}
                  className="w-8 h-8 rounded-full border-2 border-blue-200"
                />
              )}
              {/* 닉네임 */}
              <span className="text-sm font-medium text-slate-700">
                {profile.nickname}
              </span>
              {/* 로그아웃 버튼 */}
              <button
                onClick={handleLogout}
                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="로그아웃"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>
      )}
      {children}
    </div>
  );
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <title>JuniFit - 나만의 운동 루틴</title>
        <meta name="description" content="운동 기록 및 루틴 관리 앱" />
      </head>
      <body className="bg-gray-50">
        <AuthGuard>
          <LayoutContent>{children}</LayoutContent>
        </AuthGuard>
      </body>
    </html>
  );
}
