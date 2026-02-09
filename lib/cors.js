const getAllowedOrigins = () => {
  const origins = [
    process.env.NEXT_PUBLIC_FRONTEND_URL,
    process.env.FRONTEND_URL,
    'https://www.dipolbutik.com',
    'https://dipolbutik.com',
    'https://dipol-frontend.vercel.app',
    'https://dipol-fe.vercel.app',
    'http://localhost:3001',
    'http://localhost:3000',
  ].filter(Boolean);
  return origins;
};

export function getCorsHeaders(request) {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const allowedOrigins = getAllowedOrigins();

  let detectedOrigin = origin;
  if (!detectedOrigin && referer) {
    try {
      const refererUrl = new URL(referer);
      detectedOrigin = refererUrl.origin;
    } catch (e) { }
  }

  let allowedOrigin;
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

  if (detectedOrigin) {
    if (detectedOrigin.includes('vercel.app')) {
      allowedOrigin = detectedOrigin;
    } else if (isProduction) {
      if (detectedOrigin.includes('dipolbutik.com')) {
        allowedOrigin = detectedOrigin;
      } else {
        allowedOrigin = 'https://www.dipolbutik.com';
      }
    } else if (allowedOrigins.includes(detectedOrigin)) {
      allowedOrigin = detectedOrigin;
    } else {
      allowedOrigin = isProduction ? 'https://www.dipolbutik.com' : 'http://localhost:3001';
    }
  } else {
    allowedOrigin = isProduction ? 'https://www.dipolbutik.com' : 'http://localhost:3001';
  }

  if (isProduction && allowedOrigin.includes('localhost')) {
    allowedOrigin = 'https://www.dipolbutik.com';
  }

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
}

