"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Play, FolderOpen, History, BarChart3, LogOut, Settings } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

type Profile = {
  nickname: string;
  avatar_url?: string;
};

export default function Page() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const getUserAndProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // 프로필 정보 가져오기
        const { data: profileData } = await supabase
          .from('profiles')
          .select('nickname, avatar_url')
          .eq('id', user.id)
          .single();

        if (profileData) {
          setProfile(profileData);
        }
      }

      setIsLoading(false);
    };

    getUserAndProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('nickname, avatar_url')
          .eq('id', session.user.id)
          .single();

        if (profileData) {
          setProfile(profileData);
        }
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    const confirmed = window.confirm('로그아웃 하시겠습니까?');
    if (!confirmed) return;

    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      
      if (error) {
        console.error('로그아웃 오류:', error);
        alert('로그아웃 중 오류가 발생했습니다.');
        return;
      }
      
      setUser(null);
      setProfile(null);
      window.location.href = '/login';
    } catch (error) {
      console.error('로그아웃 오류:', error);
      alert('로그아웃 중 오류가 발생했습니다.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-600">로딩 중...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        {/* 사용자 프로필 헤더 */}
        {user && profile && (
          <div className="mb-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-xl p-6 text-white">
            <div className="flex items-center gap-4">
              {/* 아바타 */}
              <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-white shadow-lg bg-white flex-shrink-0">
                <img 
                  src={profile.avatar_url || `https://api.dicebear.com/9.x/notionists/svg?seed=${profile.nickname}`}
                  alt={profile.nickname}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* 닉네임과 환영 메시지 */}
              <div className="flex-1 min-w-0">
                <p className="text-sm opacity-90 mb-1">환영합니다!</p>
                <h2 className="text-2xl font-bold truncate">{profile.nickname}님</h2>
              </div>

              {/* 설정 버튼 */}
              <Link
                href="/settings"
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                title="설정"
              >
                <Settings className="w-5 h-5" />
              </Link>

              {/* 로그아웃 버튼 */}
              <button
                onClick={handleLogout}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                title="로그아웃"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* 메인 액션 버튼들 */}
        <div className="w-full flex gap-6 mb-6">
          <Link
            href="/templates/new"
            className="flex-1 bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center justify-center gap-4 text-center hover:shadow-xl transition-shadow"
            aria-label="새 프로그램 만들기"
          >
            <Plus className="w-14 h-14 text-slate-700" />
            <span className="text-lg font-medium text-slate-800">새 프로그램 만들기</span>
          </Link>

          <Link
            href="/workout"
            className="flex-1 bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center justify-center gap-4 text-center hover:shadow-xl transition-shadow"
            aria-label="오늘의 운동 시작"
          >
            <Play className="w-14 h-14 text-slate-700" />
            <span className="text-lg font-medium text-slate-800">오늘의 운동 시작</span>
          </Link>
        </div>

        {/* 프로그램 관리 버튼 */}
        <Link href="/programs/manage" className="w-full mb-3">
          <Card padding="sm" hover className="flex items-center justify-center gap-3">
            <FolderOpen className="w-5 h-5 text-blue-600" />
            <span className="text-base font-medium text-slate-800">저장된 프로그램 목록 관리</span>
          </Card>
        </Link>

        {/* 운동 기록 보기 버튼 */}
        <Link href="/history" className="w-full mb-3">
          <Card padding="sm" hover className="flex items-center justify-center gap-3">
            <History className="w-5 h-5 text-green-600" />
            <span className="text-base font-medium text-slate-800">지난 운동 기록 보기</span>
          </Card>
        </Link>

        {/* 대시보드 버튼 */}
        <Link
          href="/dashboard"
          className="w-full bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-md p-4 flex items-center justify-center gap-3 hover:shadow-lg transition-shadow text-white"
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-base font-medium">나의 운동 대시보드</span>
        </Link>


        
      </div>
    </main>
  );
}
