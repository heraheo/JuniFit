"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Play, FolderOpen, History, BarChart3, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export default function Page() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setIsLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    const confirmed = window.confirm('로그아웃 하시겠습니까?');
    if (!confirmed) return;

    try {
      await supabase.auth.signOut();
      // 로그아웃 후 상태 초기화 및 리다이렉트
      setUser(null);
      window.location.reload();
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
        {/* 헤더 - 로그인 상태 표시 */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-4">JuniFit</h1>
          
          {user ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-green-800 font-medium mb-2">
                ✅ 로그인 되었습니다!
              </p>
              <p className="text-sm text-green-600 mb-3">
                User ID: {user.id.slice(0, 8)}...
              </p>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <LogOut className="w-4 h-4" />
                로그아웃
              </button>
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-blue-800 font-medium mb-3">
                로그인이 필요합니다
              </p>
              <Link
                href="/login"
                className="inline-block px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                로그인 하러 가기
              </Link>
            </div>
          )}
        </div>

        {/* 기존 메뉴들 */}
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
        <Link
          href="/programs/manage"
          className="w-full bg-white rounded-xl shadow-md p-4 flex items-center justify-center gap-3 hover:shadow-lg transition-shadow border border-gray-100"
        >
          <FolderOpen className="w-5 h-5 text-blue-600" />
          <span className="text-base font-medium text-slate-800">저장된 프로그램 목록 관리</span>
        </Link>

        {/* 운동 기록 보기 버튼 */}
        <Link
          href="/history"
          className="w-full mt-3 bg-white rounded-xl shadow-md p-4 flex items-center justify-center gap-3 hover:shadow-lg transition-shadow border border-gray-100"
        >
          <History className="w-5 h-5 text-green-600" />
          <span className="text-base font-medium text-slate-800">지난 운동 기록 보기</span>
        </Link>

        {/* 대시보드 버튼 */}
        <Link
          href="/dashboard"
          className="w-full mt-3 bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-md p-4 flex items-center justify-center gap-3 hover:shadow-lg transition-shadow text-white"
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-base font-medium">나의 운동 대시보드</span>
        </Link>
      </div>
    </main>
  );
}
