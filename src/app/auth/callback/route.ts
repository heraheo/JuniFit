import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const cookieStore = await cookies();
    
    // Server-side Supabase 클라이언트 생성 (쿠키 지원)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    // PKCE 흐름: 인증 코드를 세션으로 교환
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error('Auth callback error:', error);
      // 에러 발생 시 로그인 페이지로 리다이렉트
      return NextResponse.redirect(new URL('/login?error=auth_failed', request.url));
    }
  }

  // 메인 페이지로 리다이렉트
  return NextResponse.redirect(new URL('/', request.url));
}
