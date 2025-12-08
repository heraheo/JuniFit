import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    // PKCE 흐름: 인증 코드를 세션으로 교환
    await supabase.auth.exchangeCodeForSession(code);
  }

  // 메인 페이지로 리다이렉트
  return NextResponse.redirect(new URL('/', request.url));
}
