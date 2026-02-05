import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { getCorsHeaders } from '@/lib/cors';

// OPTIONS handler for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeaders(request),
  });
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    console.log('[Verify Email] Token received:', token ? `${token.substring(0, 10)}...` : 'null');

    if (!token) {
      console.log('[Verify Email] No token provided');
      return NextResponse.json(
        { error: 'Doğrulama token\'ı bulunamadı' },
        { 
          status: 400,
          headers: getCorsHeaders(request),
        }
      );
    }

    // Token ile kullanıcıyı bul
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationTokenExpiry: { $gt: new Date() }, // Token süresi dolmamış olmalı
    });

    if (!user) {
      // Token'ı bulamadıysa, belki süresi dolmuş olabilir - kontrol et
      const expiredUser = await User.findOne({
        emailVerificationToken: token,
      });
      
      if (expiredUser) {
        console.log('[Verify Email] Token expired for user:', expiredUser.email);
        return NextResponse.json(
          { error: 'Doğrulama token\'ının süresi dolmuş. Lütfen yeni bir doğrulama linki isteyin.' },
          { 
            status: 400,
            headers: getCorsHeaders(request),
          }
        );
      }
      
      console.log('[Verify Email] Token not found:', token.substring(0, 10));
      return NextResponse.json(
        { error: 'Geçersiz doğrulama token\'ı' },
        { 
          status: 400,
          headers: getCorsHeaders(request),
        }
      );
    }

    // Email zaten doğrulanmış mı kontrol et
    if (user.emailVerified) {
      console.log('[Verify Email] Email already verified for user:', user.email);
      return NextResponse.json(
        { message: 'E-posta adresiniz zaten doğrulanmış' },
        {
          headers: getCorsHeaders(request),
        }
      );
    }

    // Email'i doğrula
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationTokenExpiry = undefined;
    await user.save();

    console.log('[Verify Email] Email verified successfully for user:', user.email);

    return NextResponse.json(
      { message: 'E-posta adresiniz başarıyla doğrulandı' },
      {
        headers: getCorsHeaders(request),
      }
    );
  } catch (error: any) {
    console.error('[Verify Email] Error:', error);
    console.error('[Verify Email] Error stack:', error?.stack);
    return NextResponse.json(
      { error: error.message || 'E-posta doğrulanamadı' },
      { 
        status: 500,
        headers: getCorsHeaders(request),
      }
    );
  }
}

