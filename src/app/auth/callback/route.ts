import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const origin = requestUrl.origin;

    if (!code) {
      return NextResponse.redirect(`${origin}/login?error=no_code`);
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      // 에러를 URL 파라미터로 전달
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
    }

    if (!data.session) {
      return NextResponse.redirect(`${origin}/login?error=no_session`);
    }

    // 신규 유저인 경우 profiles 테이블에 행 생성
    const userId = data.session.user.id;
    
    // 기존 프로필 확인
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    // 프로필이 없으면 생성
    if (!existingProfile) {
      await supabase
        .from('profiles')
        .insert({
          id: userId,
          nickname: null,
          avatar_url: null,
        });
    }
    
    // 성공 시 메인 페이지로
    return NextResponse.redirect(`${origin}/?login=success`);
    
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.redirect(`${request.url.split('?')[0].replace('/auth/callback', '/login')}?error=${encodeURIComponent(errorMsg)}`);
  }
}
