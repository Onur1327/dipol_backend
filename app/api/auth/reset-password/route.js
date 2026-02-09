import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb.js';
import User from '../../../../models/User.js';
import bcrypt from 'bcryptjs';
import { validatePasswordStrength } from '../../../../lib/security.js';
import { getCorsHeaders } from '../../../../lib/cors.js';
import { z } from 'zod';

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token gereklidir'),
  password: z.string().min(8, 'Şifre en az 8 karakter olmalıdır'),
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
    const validatedData = resetPasswordSchema.parse(body);

    const user = await User.findOne({
      resetToken: validatedData.token,
      resetTokenExpiry: { $gt: new Date() },
    });

    if (!user) return NextResponse.json({ error: 'Geçersiz veya süresi dolmuş token' }, { status: 400, headers: getCorsHeaders(request) });

    const passwordCheck = validatePasswordStrength(validatedData.password);
    if (!passwordCheck.valid) return NextResponse.json({ error: passwordCheck.message }, { status: 400, headers: getCorsHeaders(request) });

    user.password = await bcrypt.hash(validatedData.password, 12);
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    return NextResponse.json({ message: 'Şifreniz başarıyla güncellendi' }, { headers: getCorsHeaders(request) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Geçersiz veri' }, { status: 400, headers: getCorsHeaders(request) });
    }
    return NextResponse.json({ error: error.message || 'İşlem başarısız' }, { status: 500, headers: getCorsHeaders(request) });
  }
}

