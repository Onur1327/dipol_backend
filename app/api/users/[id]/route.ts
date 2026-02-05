import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { getCurrentUser } from '@/lib/auth';
import { getCorsHeaders } from '@/lib/cors';
import bcrypt from 'bcryptjs';

// OPTIONS handler for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeaders(request),
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Yetkisiz erişim' },
        { 
          status: 401,
          headers: getCorsHeaders(request),
        }
      );
    }

    await connectDB();
    const { id } = await params;

    const foundUser = await User.findById(id).select('-password').lean();

    if (!foundUser) {
      return NextResponse.json(
        { error: 'Kullanıcı bulunamadı' },
        { 
          status: 404,
          headers: getCorsHeaders(request),
        }
      );
    }

    return NextResponse.json(foundUser, {
      headers: getCorsHeaders(request),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Kullanıcı getirilemedi' },
      { 
        status: 500,
        headers: getCorsHeaders(request),
      }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Yetkisiz erişim' },
        { 
          status: 401,
          headers: getCorsHeaders(request),
        }
      );
    }

    await connectDB();
    const { id } = await params;

    const body = await request.json();
    const updateData: any = { ...body };

    // Şifre güncelleniyorsa hash'le
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 12);
    }

    const updatedUser = await User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).select('-password');

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'Kullanıcı bulunamadı' },
        { 
          status: 404,
          headers: getCorsHeaders(request),
        }
      );
    }

    return NextResponse.json(updatedUser, {
      headers: getCorsHeaders(request),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Kullanıcı güncellenemedi' },
      { 
        status: 500,
        headers: getCorsHeaders(request),
      }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Yetkisiz erişim' },
        { 
          status: 401,
          headers: getCorsHeaders(request),
        }
      );
    }

    await connectDB();
    const { id } = await params;

    // Kendi hesabını silmesini engelle
    if (user.userId === id) {
      return NextResponse.json(
        { error: 'Kendi hesabınızı silemezsiniz' },
        { 
          status: 400,
          headers: getCorsHeaders(request),
        }
      );
    }

    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) {
      return NextResponse.json(
        { error: 'Kullanıcı bulunamadı' },
        { 
          status: 404,
          headers: getCorsHeaders(request),
        }
      );
    }

    return NextResponse.json({ message: 'Kullanıcı silindi' }, {
      headers: getCorsHeaders(request),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Kullanıcı silinemedi' },
      { 
        status: 500,
        headers: getCorsHeaders(request),
      }
    );
  }
}

