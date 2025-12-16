import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const SESSION_TIMEOUT_MS = 4000;

export async function proxy(request: NextRequest) {
  try {
    const timeoutPromise = new Promise<NextResponse>((resolve) => {
      setTimeout(() => resolve(NextResponse.next()), SESSION_TIMEOUT_MS);
    });

    return await Promise.race([
      updateSession(request),
      timeoutPromise,
    ]);
  } catch (error) {
    console.error('Session middleware error, falling back:', error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|_next/data|favicon.ico|manifest.json|sw.js|workbox-.*|icon\\.png|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
