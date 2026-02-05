import { NextRequest } from 'next/server';

// İzin verilen origin'ler
const getAllowedOrigins = (): string[] => {
  const origins = [
    process.env.NEXT_PUBLIC_FRONTEND_URL,
    process.env.FRONTEND_URL,
    'https://www.dipolbutik.com', // Production domain
    'https://dipolbutik.com', // www olmadan da izin ver
    'https://dipol-frontend.vercel.app',
    'https://dipol-fe.vercel.app',
    'http://localhost:3001',
    'http://localhost:3000',
  ].filter(Boolean) as string[];
  
  return origins;
};

// Origin'e göre CORS header'ları döndür
export function getCorsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const allowedOrigins = getAllowedOrigins();
  
  // Origin veya referer'dan origin'i belirle
  let detectedOrigin: string | null = origin;
  if (!detectedOrigin && referer) {
    try {
      const refererUrl = new URL(referer);
      detectedOrigin = refererUrl.origin;
    } catch (e) {
      // URL parse hatası
    }
  }
  
  // Origin izin verilenler arasındaysa kullan
  let allowedOrigin: string;
  
  // Production'da her zaman vercel.app domain'lerine öncelik ver
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  
  if (detectedOrigin) {
    // Vercel domain'leri için otomatik izin ver (hem frontend hem backend)
    if (detectedOrigin.includes('vercel.app')) {
      allowedOrigin = detectedOrigin;
    } else if (isProduction) {
      // Production'da www.dipolbutik.com veya vercel.app domain'lerine öncelik ver
      if (detectedOrigin.includes('dipolbutik.com')) {
        allowedOrigin = detectedOrigin;
      } else {
        allowedOrigin = 'https://www.dipolbutik.com';
      }
    } else if (allowedOrigins.includes(detectedOrigin)) {
      // Development'ta izin verilen origin'leri kullan
      allowedOrigin = detectedOrigin;
    } else {
      // Origin izin verilenler arasında değilse, production frontend URL'ini kullan
      allowedOrigin = isProduction ? 'https://www.dipolbutik.com' : 'http://localhost:3001';
    }
  } else {
    // Origin header yoksa, environment'a göre kullan
    allowedOrigin = isProduction ? 'https://www.dipolbutik.com' : 'http://localhost:3001';
  }
  
  // Güvenlik: Production'da localhost kullanma
  if (isProduction && allowedOrigin.includes('localhost')) {
    allowedOrigin = 'https://www.dipolbutik.com';
  }
  
  // Debug için log
  console.log('[CORS] Origin:', origin, 'Referer:', referer, '-> Allowed:', allowedOrigin);
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
}

