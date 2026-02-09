import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { getCorsHeaders } from '@/lib/cors';

export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeaders(request),
  });
}

export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) return NextResponse.json({ error: 'Doğrulama token\'ı bulunamadı' }, { status: 400, headers: getCorsHeaders(request) });

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationTokenExpiry: { $gt: new Date() },
    });

    if (!user) {
      const expiredUser = await User.findOne({ emailVerificationToken: token });
      if (expiredUser) {
        return NextResponse.json({ error: 'Doğrulama token\'ının süresi dolmuş. Lütfen yeni bir doğrulama linki isteyin.' }, { status: 400, headers: getCorsHeaders(request) });
      }
      return NextResponse.json({ error: 'Geçersiz doğrulama token\'ı' }, { status: 400, headers: getCorsHeaders(request) });
    }

    if (user.emailVerified) return NextResponse.json({ message: 'E-posta adresiniz zaten doğrulanmış' }, { headers: getCorsHeaders(request) });

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationTokenExpiry = undefined;
    await user.save();

    return NextResponse.json({ message: 'E-posta adresiniz başarıyla doğrulandı' }, { headers: getCorsHeaders(request) });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'E-posta doğrulanamadı' }, { status: 500, headers: getCorsHeaders(request) });
  }
}

