import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb.js';
import User from '../../../../models/User.js';
import { sendEmail } from '../../../../lib/email.js';
import { sanitizeEmail } from '../../../../lib/security.js';
import { z } from 'zod';
import { getCorsHeaders } from '../../../../lib/cors.js';
import crypto from 'crypto';

const forgotPasswordSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi giriniz'),
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
    const body = await request.json();
    const validatedData = forgotPasswordSchema.parse(body);
    const sanitizedEmail = sanitizeEmail(validatedData.email);

    const user = await User.findOne({ email: sanitizedEmail });
    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 3600000);
      user.resetToken = resetToken;
      user.resetTokenExpiry = resetTokenExpiry;
      await user.save();
      try {
        await sendPasswordResetEmail(user.email, resetToken);
      } catch (emailError) {
        console.error('Şifre sıfırlama maili gönderilemedi:', emailError);
      }
    }

    return NextResponse.json({
      message: 'Eğer bu e-posta adresi kayıtlıysa, şifre sıfırlama bağlantısı gönderildi.',
    }, {
      headers: getCorsHeaders(request),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Geçersiz veri' }, { status: 400, headers: getCorsHeaders(request) });
    }
    return NextResponse.json({ error: error.message || 'İşlem başarısız' }, { status: 500, headers: getCorsHeaders(request) });
  }
}

