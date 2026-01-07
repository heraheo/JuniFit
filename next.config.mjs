import withPWAInit from '@ducanh2912/next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: false,
  cacheOnFrontEndNav: false,
  reloadOnOnline: true,
  workboxOptions: {
    disableDevLogs: true,
    // 개발 모드에서 PWA 캐싱 최소화
    runtimeCaching: process.env.NODE_ENV === 'development' ? [] : [
      {
        urlPattern: ({ url }) => url.pathname.startsWith('/_next/static/'),
        handler: 'CacheFirst',
        options: {
          cacheName: 'next-static-assets',
          expiration: {
            maxEntries: 64,
            maxAgeSeconds: 60 * 60 * 24 * 7,
          },
        },
      },
      {
        urlPattern: ({ url }) => url.pathname.match(/\.(?:png|jpg|jpeg|gif|svg|webp|ico)$/i),
        handler: 'CacheFirst',
        options: {
          cacheName: 'image-assets',
          expiration: {
            maxEntries: 64,
            maxAgeSeconds: 60 * 60 * 24 * 30,
          },
        },
      },
      {
        urlPattern: ({ request }) => request.mode === 'navigate',
        handler: 'NetworkOnly',
      },
    ],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Turbopack 빌드 설정
  // Next.js 16에서는 기본으로 Turbopack이 활성화됨
  // Vercel에서는 자동으로 Turbopack 사용

  // 정적 리소스 최적화
  compress: true,

  // 이미지 최적화
  images: {
    formats: ['image/webp'],
    remotePatterns: [],
  },
};

export default withPWA(nextConfig);

