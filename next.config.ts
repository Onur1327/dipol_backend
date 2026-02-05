import type { NextConfig } from "next";

const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || process.env.FRONTEND_URL || 'http://localhost:3001';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Tüm sayfalar için güvenlik başlıkları
        source: '/:path*',
        headers: [
          // XSS koruması
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          // Referrer Policy
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Permissions Policy
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // Strict Transport Security (HTTPS zorunluluğu - production'da)
          ...(process.env.NODE_ENV === 'production' ? [
            { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          ] : []),
        ],
      },
      {
        // API endpoints için güvenlik başlıkları (CORS route handler'larda yönetiliyor)
        source: '/api/:path*',
        headers: [
          // XSS koruması
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ];
  },
};

export default nextConfig;
