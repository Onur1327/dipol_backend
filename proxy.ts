import { NextRequest, NextResponse } from 'next/server';
import { getCorsHeaders } from '@/lib/cors';

// Rate limiting için basit bir in-memory store
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Rate limiting ayarları
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 dakika
const RATE_LIMIT_MAX_REQUESTS = 100; // 1 dakikada maksimum 100 istek
const RATE_LIMIT_AUTH_MAX = 5; // Auth endpoint'leri için daha düşük limit

// Rate limiting kontrolü
function checkRateLimit(ip: string, isAuthEndpoint: boolean = false): boolean {
  const now = Date.now();
  const limit = isAuthEndpoint ? RATE_LIMIT_AUTH_MAX : RATE_LIMIT_MAX_REQUESTS;
  
  const record = rateLimitMap.get(ip);
  
  if (!record || now > record.resetTime) {
    // Yeni pencere başlat
    rateLimitMap.set(ip, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return true;
  }
  
  if (record.count >= limit) {
    return false; // Rate limit aşıldı
  }
  
  record.count++;
  return true;
}

// IP adresini al
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  // Next.js'te request.ip yok, sadece header'lardan alıyoruz
  return forwarded?.split(',')[0]?.trim() || realIP || 'unknown';
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = getClientIP(request);
  
  // API endpoint'leri için rate limiting
  if (pathname.startsWith('/api/')) {
    const isAuthEndpoint = pathname.includes('/auth/');
    
    if (!checkRateLimit(ip, isAuthEndpoint)) {
      return NextResponse.json(
        { error: 'Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.' },
        { status: 429 }
      );
    }
    
    // OPTIONS istekleri için CORS preflight
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: getCorsHeaders(request),
      });
    }
  }
  
  // Production'da HTTPS zorunluluğu (sadece non-API route'lar için)
  // API endpoint'lerine redirect yapmıyoruz çünkü bu redirect döngüsüne neden olabilir
  if (process.env.NODE_ENV === 'production' && !pathname.startsWith('/api/')) {
    const protocol = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol;
    if (protocol !== 'https:') {
      return NextResponse.redirect(
        `https://${request.nextUrl.hostname}${request.nextUrl.pathname}${request.nextUrl.search}`,
        301
      );
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/:path*',
  ],
};

