"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function OnboardingPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [hasKakaoData, setHasKakaoData] = useState(false);

  useEffect(() => {
    // 현재 로그인된 유저 확인 및 Kakao 프로필 정보 가져오기
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUserId(session.user.id);

      // Kakao OAuth에서 받은 메타데이터 확인
      const userMetadata = session.user.user_metadata;
      
      // Kakao 닉네임이 있으면 기본값으로 설정
      if (userMetadata?.full_name || userMetadata?.name) {
        const kakaoNickname = userMetadata.full_name || userMetadata.name;
        setNickname(kakaoNickname);
        setHasKakaoData(true);
      }

      // Kakao 프로필 사진이 있으면 기본값으로 설정
      if (userMetadata?.avatar_url || userMetadata?.picture) {
        const kakaoAvatar = userMetadata.avatar_url || userMetadata.picture;
        setAvatarUrl(kakaoAvatar);
      }
    };
    checkUser();
  }, [router]);

  // 닉네임 변경 시 아바타 URL 업데이트 (Kakao 프사가 없을 때만)
  useEffect(() => {
    if (nickname.trim() && !hasKakaoData) {
      setAvatarUrl(`https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(nickname)}`);
    }
  }, [nickname, hasKakaoData]);

  const handleSave = async () => {
    if (!nickname.trim()) {
      alert("닉네임을 입력해주세요.");
      return;
    }

    if (!userId) {
      alert("사용자 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    setSaving(true);

    try {
      // profiles 테이블에 닉네임과 아바타 저장
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          nickname: nickname.trim(),
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      // 성공 시 메인으로 이동
      router.push('/');
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('프로필 저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-center text-slate-800 mb-2">프로필 설정</h1>
        <p className="text-center text-slate-600 mb-8">나만의 닉네임을 설정해주세요</p>

        {/* 아바타 미리보기 */}
        <div className="flex justify-center mb-6">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Avatar Preview"
              className="w-24 h-24 rounded-full border-4 border-blue-200 shadow-lg"
            />
          ) : (
            <div className="w-24 h-24 rounded-full border-4 border-gray-200 bg-gray-100 flex items-center justify-center">
              <span className="text-gray-400 text-sm">미리보기</span>
            </div>
          )}
        </div>

        {/* 닉네임 입력 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">닉네임</label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="닉네임을 입력하세요"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            maxLength={20}
          />
          <p className="text-xs text-slate-500 mt-2">
            {hasKakaoData 
              ? "카카오 정보를 가져왔습니다. 원하시면 수정하세요."
              : "닉네임을 입력하면 자동으로 아바타가 생성됩니다"}
          </p>
        </div>

        {/* 저장 버튼 */}
        <button
          onClick={handleSave}
          disabled={saving || !nickname.trim()}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-lg transition-all ${
            saving || !nickname.trim()
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl"
          }`}
        >
          {saving ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              저장 중...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              시작하기
            </>
          )}
        </button>
      </div>
    </div>
  );
}
