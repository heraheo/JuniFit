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
    
    // 성공 시 메인 페이지로
    return NextResponse.redirect(`${origin}/?login=success`);
    
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.redirect(`${request.url.split('?')[0].replace('/auth/callback', '/login')}?error=${encodeURIComponent(errorMsg)}`);
  }
}
