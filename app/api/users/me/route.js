import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb.js';
import User from '../../../../models/User.js';
import { getCurrentUser } from '../../../../lib/auth.js';
import { getCorsHeaders } from '../../../../lib/cors.js';
import { sanitizeInput, validateTCIdentityNumber } from '../../../../lib/security.js';

export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeaders(request),
  });
}

export async function GET(request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401, headers: getCorsHeaders(request) });
    }

    await connectDB();
    const foundUser = await User.findById(user.userId).select('-password -resetToken -resetTokenExpiry -identityNumber').lean();
    if (!foundUser) return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404, headers: getCorsHeaders(request) });

    return NextResponse.json(foundUser, { headers: getCorsHeaders(request) });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Kullanıcı getirilemedi' }, { status: 500, headers: getCorsHeaders(request) });
  }
}

export async function PUT(request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401, headers: getCorsHeaders(request) });
    }

    await connectDB();
    const body = await request.json();
    const updateData = {};

    if (body.name) updateData.name = sanitizeInput(body.name);
    if (body.phone !== undefined) updateData.phone = body.phone ? sanitizeInput(body.phone) : undefined;
    if (body.identityNumber) {
      const tcValidation = validateTCIdentityNumber(body.identityNumber);
      if (!tcValidation.valid) {
        return NextResponse.json({ error: tcValidation.message || 'Geçersiz TC Kimlik numarası' }, { status: 400, headers: getCorsHeaders(request) });
      }
      updateData.identityNumber = body.identityNumber;
    }
    if (body.address) {
      updateData.address = {
        street: body.address.street ? sanitizeInput(body.address.street) : undefined,
        city: body.address.city ? sanitizeInput(body.address.city) : undefined,
        postalCode: body.address.postalCode ? sanitizeInput(body.address.postalCode) : undefined,
        country: body.address.country ? sanitizeInput(body.address.country) : undefined,
      };
    }

    const updatedUser = await User.findByIdAndUpdate(user.userId, updateData, { new: true, runValidators: true }).select('-password -resetToken -resetTokenExpiry -identityNumber');
    if (!updatedUser) return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404, headers: getCorsHeaders(request) });

    return NextResponse.json(updatedUser, { headers: getCorsHeaders(request) });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Kullanıcı güncellenemedi' }, { status: 500, headers: getCorsHeaders(request) });
  }
}

