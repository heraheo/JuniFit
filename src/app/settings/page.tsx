"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, LogOut, User } from "lucide-react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { TABLE_NAMES, AVATAR } from "@/constants";
import { useAuthProfile } from "@/hooks/useAuthProfile";

export default function SettingsPage() {
  const { user, profile, loading, refresh } = useAuthProfile();
  const [nickname, setNickname] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  // 닉네임 기반 아바타 URL 생성 (미리보기용)
  const previewAvatarUrl = nickname 
    ? `${AVATAR.API_BASE}?seed=${encodeURIComponent(nickname)}`
    : `${AVATAR.API_BASE}?seed=${AVATAR.DEFAULT_SEED}`;

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (profile) {
      setNickname(profile.nickname);
    }
  }, [profile, router, user]);

  const handleSaveNickname = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nickname.trim()) {
      alert('닉네임을 입력해주세요.');
      return;
    }

    if (nickname === profile?.nickname) {
      alert('변경사항이 없습니다.');
      return;
    }

    setIsSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        alert('사용자 정보를 불러올 수 없습니다.');
        return;
      }

      // 닉네임과 새 아바타 URL 저장
      const newAvatarUrl = `${AVATAR.API_BASE}?seed=${encodeURIComponent(nickname.trim())}`;
      
      const { error } = await supabase
        .from(TABLE_NAMES.PROFILES)
        .update({
          nickname: nickname.trim(),
          avatar_url: newAvatarUrl,
        })
        .eq('id', user.id);

      if (error) {
        console.error('프로필 저장 오류:', error);
        alert(`프로필 저장 실패: ${error.message}`);
        return;
      }

      // 상태 업데이트
      await refresh();
      alert('닉네임이 성공적으로 변경되었습니다!');
      
    } catch (error) {
      console.error('예상치 못한 오류:', error);
      alert('프로필 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

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
      
      router.push('/login');
    } catch (error) {
      console.error('로그아웃 오류:', error);
      alert('로그아웃 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-600">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* 헤더 */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/"
            className="p-2 hover:bg-white rounded-lg transition-colors"
            aria-label="뒤로가기"
          >
            <ArrowLeft className="w-6 h-6 text-slate-700" />
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">설정</h1>
        </div>

        {/* 프로필 카드 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <User className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-slate-800">프로필 정보</h2>
          </div>

          <form onSubmit={handleSaveNickname} className="space-y-6">
            {/* 아바타 미리보기 */}
            <div className="flex justify-center">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-purple-200 shadow-lg bg-white">
                <Image
                  src={previewAvatarUrl}
                  alt="아바타 미리보기"
                  width={128}
                  height={128}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* 닉네임 입력 */}
            <Input
              label="닉네임"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="닉네임을 입력하세요"
              disabled={isSaving}
              maxLength={20}
              helperText="닉네임을 변경하면 아바타도 자동으로 변경됩니다."
            />

            {/* 저장 버튼 */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isSaving}
            >
              저장하기
            </Button>
          </form>
        </div>

        {/* 로그아웃 버튼 */}
        <Button
          onClick={handleLogout}
          variant="danger"
          size="lg"
          fullWidth
        >
          <LogOut className="w-5 h-5" />
          로그아웃
        </Button>
      </div>
    </div>
  );
}
