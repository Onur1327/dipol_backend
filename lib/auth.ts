import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

// JWT_SECRET kontrolü - production'da mutlaka set edilmeli
const JWT_SECRET_ENV = process.env.JWT_SECRET;

if (!JWT_SECRET_ENV) {
  throw new Error('JWT_SECRET environment variable tanımlanmamış!');
}

if (JWT_SECRET_ENV.length < 32) {
  console.warn('⚠️  UYARI: JWT_SECRET çok kısa. En az 32 karakter olmalıdır.');
}

if (JWT_SECRET_ENV === 'your-secret-key' || JWT_SECRET_ENV.includes('change-in-production')) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET production değeri kullanılıyor! Güvenli bir secret key oluşturun.');
  }
}

// TypeScript için: JWT_SECRET artık kesinlikle string
const JWT_SECRET: string = JWT_SECRET_ENV;

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
}

export function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

export async function getCurrentUser(request: NextRequest): Promise<TokenPayload | null> {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  return verifyToken(token);
}

