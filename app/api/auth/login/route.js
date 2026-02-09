import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import connectDB from '../../../../lib/mongodb.js';
import User from '../../../../models/User.js';
import { generateToken } from '../../../../lib/auth.js';
import { sanitizeEmail } from '../../../../lib/security.js';
import { getCorsHeaders } from '../../../../lib/cors.js';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi giriniz'),
  password: z.string().min(1, 'Şifre gereklidir'),
});

export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeaders(request),
  });
}

export async function POST(request) {
  try {
    await connectDB();
    const dbName = mongoose.connection.db?.databaseName;
    console.log('[LOGIN] Bağlanılan database:', dbName);

    const body = await request.json();
    const validatedData = loginSchema.parse(body);

    const sanitizedEmail = sanitizeEmail(validatedData.email);
    const user = await User.findOne({ email: sanitizedEmail }).select('+password');

    if (!user) {
      return NextResponse.json(
        { error: 'E-posta veya şifre hatalı' },
        { status: 401, headers: getCorsHeaders(request) }
      );
    }

    if (!user.emailVerified) {
      return NextResponse.json(
        { error: 'Lütfen giriş yapmadan önce e-posta adresinizi doğrulayın.' },
        { status: 403, headers: getCorsHeaders(request) }
      );
    }

    const isPasswordValid = await bcrypt.compare(validatedData.password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'E-posta veya şifre hatalı' },
        { status: 401, headers: getCorsHeaders(request) }
      );
    }

    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return NextResponse.json({
      message: 'Giriş başarılı',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    }, {
      headers: getCorsHeaders(request),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Geçersiz veri' },
        { status: 400, headers: getCorsHeaders(request) }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Giriş işlemi başarısız' },
      { status: 500, headers: getCorsHeaders(request) }
    );
  }
}

