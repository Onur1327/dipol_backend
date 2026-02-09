import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb.js';
import User from '../../../../models/User.js';
import { getCurrentUser } from '../../../../lib/auth.js';
import { getCorsHeaders } from '../../../../lib/cors.js';
import bcrypt from 'bcryptjs';

export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeaders(request),
  });
}

export async function GET(request, { params }) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401, headers: getCorsHeaders(request) });
    }

    await connectDB();
    const { id } = await params;
    const foundUser = await User.findById(id).select('-password').lean();
    if (!foundUser) return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404, headers: getCorsHeaders(request) });

    return NextResponse.json(foundUser, { headers: getCorsHeaders(request) });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Kullanıcı getirilemedi' }, { status: 500, headers: getCorsHeaders(request) });
  }
}

export async function PUT(request, { params }) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401, headers: getCorsHeaders(request) });
    }

    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const updateData = { ...body };

    if (updateData.password) updateData.password = await bcrypt.hash(updateData.password, 12);

    const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).select('-password');
    if (!updatedUser) return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404, headers: getCorsHeaders(request) });

    return NextResponse.json(updatedUser, { headers: getCorsHeaders(request) });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Kullanıcı güncellenemedi' }, { status: 500, headers: getCorsHeaders(request) });
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401, headers: getCorsHeaders(request) });
    }

    await connectDB();
    const { id } = await params;
    if (user.userId === id) return NextResponse.json({ error: 'Kendi hesabınızı silemezsiniz' }, { status: 400, headers: getCorsHeaders(request) });

    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404, headers: getCorsHeaders(request) });

    return NextResponse.json({ message: 'Kullanıcı silindi' }, { headers: getCorsHeaders(request) });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Kullanıcı silinemedi' }, { status: 500, headers: getCorsHeaders(request) });
  }
}

