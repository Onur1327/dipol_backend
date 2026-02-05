import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { getCurrentUser } from '@/lib/auth';
import { getCorsHeaders } from '@/lib/cors';

// OPTIONS handler for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeaders(request),
  });
}

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;
    const search = searchParams.get('search');

    const query: any = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(query)
      .select('-password') // Şifreyi döndürme
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await User.countDocuments(query);

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }, {
      headers: getCorsHeaders(request),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Kullanıcılar getirilemedi' },
      { 
        status: 500,
        headers: getCorsHeaders(request),
      }
    );
  }
}

