"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { TABLE_NAMES, AVATAR } from "@/constants";

export default function OnboardingPage() {
  const [nickname, setNickname] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      } else {
        router.push('/login');
      }
    };
    getUser();
  }, [router, supabase]);

  // 닉네임 기반 아바타 URL 생성
  const avatarUrl = nickname 
    ? `${AVATAR.API_BASE}?seed=${encodeURIComponent(nickname)}`
    : `${AVATAR.API_BASE}?seed=${AVATAR.DEFAULT_SEED}`;


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
        .from(TABLE_NAMES.PROFILES)
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

      // 성공 시 메인 페이지로 이동 (AuthGuard가 자동으로 처리)
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
              <Image
                src={avatarUrl}
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
            maxLength={20}
            disabled={isLoading}
            autoFocus
            helperText={`입력하면 위의 아바타가 변경됩니다 (${nickname.length}/20)`}
          />

          {/* 시작하기 버튼 */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            disabled={!nickname.trim()}
            isLoading={isLoading}
          >
            시작하기
          </Button>
        </form>

        {/* 추가 안내 */}
        <p className="text-center text-sm text-slate-500 mt-6">
          닉네임은 나중에 변경할 수 있습니다
        </p>
      </div>
    </div>
  );
}
