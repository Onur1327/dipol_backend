import { NextResponse } from 'next/server';
import { getCorsHeaders } from '@/lib/cors';

const rateLimitMap = new Map();

const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 100;
const RATE_LIMIT_AUTH_MAX = 5;

function checkRateLimit(ip, isAuthEndpoint = false) {
  const now = Date.now();
  const limit = isAuthEndpoint ? RATE_LIMIT_AUTH_MAX : RATE_LIMIT_MAX_REQUESTS;

  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}

function getClientIP(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  return forwarded?.split(',')[0]?.trim() || realIP || 'unknown';
}

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const ip = getClientIP(request);

  if (pathname.startsWith('/api/')) {
    const isAuthEndpoint = pathname.includes('/auth/');

    if (!checkRateLimit(ip, isAuthEndpoint)) {
      return NextResponse.json(
        { error: 'Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.' },
        { status: 429 }
      );
    }

    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: getCorsHeaders(request),
      });
    }
  }

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

