import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { generateToken } from '@/lib/auth';
import { sanitizeInput, sanitizeEmail, validatePasswordStrength, validateBodySize } from '@/lib/security';
import { getCorsHeaders } from '@/lib/cors';
import { sendEmailVerificationEmail } from '@/lib/email';
import { z } from 'zod';

const registerSchema = z.object({
  name: z.string().min(2, 'İsim en az 2 karakter olmalıdır').max(100, 'İsim çok uzun'),
  email: z.string().email('Geçerli bir e-posta adresi giriniz'),
  password: z.string().min(8, 'Şifre en az 8 karakter olmalıdır'),
  phone: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
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

    const body = await request.json();
    const validatedData = registerSchema.parse(body);

    // Input sanitization
    const sanitizedName = sanitizeInput(validatedData.name);
    const sanitizedEmail = sanitizeEmail(validatedData.email);
    
    // Şifre güç kontrolü
    const passwordCheck = validatePasswordStrength(validatedData.password);
    if (!passwordCheck.valid) {
      return NextResponse.json(
        { error: passwordCheck.message },
        { 
          status: 400,
          headers: getCorsHeaders(request),
        }
      );
    }

    const existingUser = await User.findOne({ email: sanitizedEmail });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Bu e-posta adresi zaten kullanılıyor' },
        { 
          status: 400,
          headers: getCorsHeaders(request),
        }
      );
    }

    const hashedPassword = await bcrypt.hash(validatedData.password, 12); // Salt rounds artırıldı

    // Email doğrulama token'ı oluştur
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationTokenExpiry = new Date();
    emailVerificationTokenExpiry.setHours(emailVerificationTokenExpiry.getHours() + 24); // 24 saat geçerli

    const user = await User.create({
      name: sanitizedName,
      email: sanitizedEmail,
      password: hashedPassword,
      phone: validatedData.phone ? sanitizeInput(validatedData.phone) : undefined,
      address: validatedData.address ? {
        street: validatedData.address.street ? sanitizeInput(validatedData.address.street) : undefined,
        city: validatedData.address.city ? sanitizeInput(validatedData.address.city) : undefined,
        postalCode: validatedData.address.postalCode ? sanitizeInput(validatedData.address.postalCode) : undefined,
        country: validatedData.address.country ? sanitizeInput(validatedData.address.country) : undefined,
      } : undefined,
      emailVerified: false,
      emailVerificationToken,
      emailVerificationTokenExpiry,
    });

    // Email doğrulama maili gönder
    try {
      await sendEmailVerificationEmail(sanitizedEmail, emailVerificationToken);
    } catch (emailError) {
      console.error('Email gönderme hatası:', emailError);
      // Email hatası olsa bile kullanıcı oluşturuldu, sadece log'la
    }

    // Kayıt sonrası token oluşturma - email doğrulanmadan giriş yapabilir ama bazı işlemler için doğrulama gerekebilir
    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return NextResponse.json(
      {
        message: 'Kayıt başarılı. Lütfen e-posta adresinizi doğrulamak için e-postanızı kontrol edin.',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          emailVerified: false,
        },
      },
      { 
        status: 201,
        headers: getCorsHeaders(request),
      }
    );
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
      { error: error.message || 'Kayıt işlemi başarısız' },
      { 
        status: 500,
        headers: getCorsHeaders(request),
      }
    );
  }
}

