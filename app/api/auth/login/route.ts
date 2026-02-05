import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { generateToken } from '@/lib/auth';
import { sanitizeEmail, validateBodySize } from '@/lib/security';
import { getCorsHeaders } from '@/lib/cors';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi giriniz'),
  password: z.string().min(1, 'Şifre gereklidir'),
});

// OPTIONS handler for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeaders(request),
  });
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    // Database adını kontrol et
    const dbName = mongoose.connection.db?.databaseName;
    console.log('[LOGIN] Bağlanılan database:', dbName);

    const body = await request.json();
    const validatedData = loginSchema.parse(body);

    // Email sanitization
    const sanitizedEmail = sanitizeEmail(validatedData.email);
    console.log('[LOGIN] Aranan email:', sanitizedEmail);

    // Password field'ını da seçmek için select kullan
    const user = await User.findOne({ email: sanitizedEmail }).select('+password');
    console.log('[LOGIN] Kullanıcı bulundu:', user ? 'Evet' : 'Hayır');
    
    if (!user) {
      // Tüm kullanıcıları listele (debug için)
      const allUsers = await User.find({}).select('email role');
      console.log('[LOGIN] Veritabanındaki tüm kullanıcılar:', JSON.stringify(allUsers, null, 2));
      
      return NextResponse.json(
        { error: 'E-posta veya şifre hatalı' },
        { 
          status: 401,
          headers: getCorsHeaders(request),
        }
      );
    }

    console.log('[LOGIN] Kullanıcı bilgileri:', {
      id: user._id,
      email: user.email,
      role: user.role,
      hasPassword: !!user.password,
      passwordLength: user.password?.length,
      passwordPrefix: user.password?.substring(0, 10) + '...'
    });

    // Şifre doğrulaması
    const isPasswordValid = await bcrypt.compare(validatedData.password, user.password);
    console.log('[LOGIN] Şifre doğrulama sonucu:', isPasswordValid);
    console.log('[LOGIN] Girilen şifre uzunluğu:', validatedData.password.length);
    
    if (!isPasswordValid) {
      // Şifre hash'ini test et
      const testHash = await bcrypt.hash(validatedData.password, 10);
      console.log('[LOGIN] Test hash oluşturuldu:', testHash.substring(0, 20) + '...');
      console.log('[LOGIN] Mevcut hash:', user.password.substring(0, 20) + '...');
      
      return NextResponse.json(
        { error: 'E-posta veya şifre hatalı' },
        { 
          status: 401,
          headers: getCorsHeaders(request),
        }
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
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Geçersiz veri' },
        { 
          status: 400,
          headers: getCorsHeaders(request),
        }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Giriş işlemi başarısız' },
      { 
        status: 500,
        headers: getCorsHeaders(request),
      }
    );
  }
}

