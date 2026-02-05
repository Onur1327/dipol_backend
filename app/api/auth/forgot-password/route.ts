import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { sendPasswordResetEmail } from '@/lib/email';
import { sanitizeEmail } from '@/lib/security';
import { z } from 'zod';
import { getCorsHeaders } from '@/lib/cors';
import crypto from 'crypto';

const forgotPasswordSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi giriniz'),
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
    const validatedData = forgotPasswordSchema.parse(body);
    
    // Email sanitization
    const sanitizedEmail = sanitizeEmail(validatedData.email);

    const user = await User.findOne({ email: sanitizedEmail });
    
    // Güvenlik için: Kullanıcı var mı yok mu bilgisini vermiyoruz
    if (user) {
      // Reset token oluştur
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 saat

      user.resetToken = resetToken;
      user.resetTokenExpiry = resetTokenExpiry;
      await user.save();

      // Email gönder
      try {
        await sendPasswordResetEmail(user.email, resetToken);
      } catch (emailError: any) {
        console.error('Email gönderme hatası:', emailError);
        // Email gönderilemese bile başarılı dönüyoruz (güvenlik)
      }
    }

    // Her durumda aynı mesajı döndür (güvenlik)
    return NextResponse.json({
      message: 'Eğer bu e-posta adresi kayıtlıysa, şifre sıfırlama bağlantısı gönderildi.',
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

