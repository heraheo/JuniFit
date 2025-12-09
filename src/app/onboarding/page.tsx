"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function OnboardingPage() {
  const [nickname, setNickname] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      } else {
        router.push('/login');
      }
    };
    getUser();
  }, [router]);

  // 닉네임 기반 아바타 URL 생성
  const avatarUrl = nickname 
    ? `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(nickname)}`
    : `https://api.dicebear.com/9.x/notionists/svg?seed=default`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nickname.trim()) {
      alert('닉네임을 입력해주세요.');
      return;
    }

    if (!userId) {
      alert('사용자 정보를 불러올 수 없습니다.');
      return;
    }

    setIsLoading(true);

    try {
      // profiles 테이블에 닉네임과 아바타 URL 저장
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          nickname: nickname.trim(),
          avatar_url: avatarUrl,
        });

      if (error) {
        console.error('프로필 저장 오류:', error);
        alert(`프로필 저장 실패: ${error.message}`);
        return;
      }

      alert('환영합니다! 프로필이 설정되었습니다.');
      router.push('/');
      
    } catch (error) {
      console.error('예상치 못한 오류:', error);
      alert('프로필 저장 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-purple-50 to-white px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">프로필 설정</h1>
          <p className="text-slate-600">당신을 뭐라고 부를까요?</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 아바타 미리보기 */}
          <div className="flex justify-center">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-purple-200 shadow-lg bg-white">
              <img 
                src={avatarUrl} 
                alt="아바타 미리보기"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* 닉네임 입력 */}
          <div>
            <label htmlFor="nickname" className="block text-sm font-medium text-slate-700 mb-2">
              닉네임
            </label>
            <input
              id="nickname"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="닉네임을 입력하세요"
              maxLength={20}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-slate-800"
              disabled={isLoading}
            />
            <p className="mt-2 text-xs text-slate-500">
              입력하면 위의 아바타가 변경됩니다 ({nickname.length}/20)
            </p>
          </div>

          {/* 시작하기 버튼 */}
          <button
            type="submit"
            disabled={isLoading || !nickname.trim()}
            className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>저장 중...</span>
              </div>
            ) : (
              '시작하기'
            )}
          </button>
        </form>

        {/* 추가 안내 */}
        <p className="text-center text-sm text-slate-500 mt-6">
          닉네임은 나중에 변경할 수 있습니다
        </p>
      </div>
    </div>
  );
}
