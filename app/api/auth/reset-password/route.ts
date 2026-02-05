import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { validatePasswordStrength } from '@/lib/security';
import { getCorsHeaders } from '@/lib/cors';
import { z } from 'zod';

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token gereklidir'),
  password: z.string().min(8, 'Şifre en az 8 karakter olmalıdır'),
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
    const validatedData = resetPasswordSchema.parse(body);

    // Token ile kullanıcıyı bul
    const user = await User.findOne({
      resetToken: validatedData.token,
      resetTokenExpiry: { $gt: new Date() }, // Token süresi dolmamış
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Geçersiz veya süresi dolmuş token' },
        { 
          status: 400,
          headers: getCorsHeaders(request),
        }
      );
    }

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

    // Şifreyi güncelle
    user.password = await bcrypt.hash(validatedData.password, 12);
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    return NextResponse.json({
      message: 'Şifreniz başarıyla güncellendi',
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
      { error: error.message || 'İşlem başarısız' },
      { 
        status: 500,
        headers: getCorsHeaders(request),
      }
    );
  }
}

