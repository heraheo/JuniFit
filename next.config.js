/** @type {import('next').NextConfig} */
const nextConfig = {
  // On-Demand ISR을 위해 동적 라우트가 런타임에 생성되도록 설정
  experimental: {
    isrMemoryCacheSize: 0, // 필요한 경우만 활성화
  },
};

module.exports = nextConfig;
