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
  // Turbopack 최적화
  // 빠른 HMR과 안정적인 연결을 위한 설정
  experimental: {
    // 기존 캐시 사용하여 빌드 속도 향상
    turbo: {
      resolveAlias: {
        // 별칭 설정으로 모듈 해석 최적화
      },
    },
  },
  
  // 개발 서버 최적화
  webpack: (config, { isServer }) => {
    // HMR 최적화
    if (!isServer) {
      config.watchOptions = {
        poll: 1000, // 1초마다 변경 감시 (기본값보다 빠름)
        aggregateTimeout: 300, // 변경 감지 후 300ms 대기
      };
    }
    
    return config;
  },

  // 정적 리소스 최적화
  compress: true,
  
  // 이미지 최적화
  images: {
    formats: ['image/webp'],
    remotePatterns: [],
  },
};

export default withPWA(nextConfig);
