import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Carousel from '@/models/Carousel';
import { getCurrentUser } from '@/lib/auth';
import { getCorsHeaders } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeaders(request),
  });
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    const query: any = {};
    if (activeOnly) {
      query.active = true;
    }

    const carousels = await Carousel.find(query)
      .sort({ order: 1, createdAt: -1 })
      .lean();

    return NextResponse.json({ carousels }, {
      headers: getCorsHeaders(request),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Carousel verileri getirilemedi' },
      { 
        status: 500,
        headers: getCorsHeaders(request),
      }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Yetkisiz erişim' },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await request.json();
    const carousel = await Carousel.create(body);

    return NextResponse.json(carousel, { 
      status: 201,
      headers: getCorsHeaders(request),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Carousel oluşturulamadı' },
      { 
        status: 500,
        headers: getCorsHeaders(request),
      }
    );
  }
}

