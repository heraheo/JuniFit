import withPWAInit from '@ducanh2912/next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  cacheOnFrontEndNav: false,
  reloadOnOnline: true,
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
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
  // Next.js 설정
};

export default withPWA(nextConfig);
