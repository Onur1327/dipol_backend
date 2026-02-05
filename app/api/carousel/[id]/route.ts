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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const carousel = await Carousel.findById(id).lean();

    if (!carousel) {
      return NextResponse.json(
        { error: 'Carousel bulunamadı' },
        { 
          status: 404,
          headers: getCorsHeaders(request),
        }
      );
    }

    return NextResponse.json(carousel, {
      headers: getCorsHeaders(request),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Carousel getirilemedi' },
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
    const carousel = await Carousel.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

    if (!carousel) {
      return NextResponse.json(
        { error: 'Carousel bulunamadı' },
        { 
          status: 404,
          headers: getCorsHeaders(request),
        }
      );
    }

    return NextResponse.json(carousel, {
      headers: getCorsHeaders(request),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Carousel güncellenemedi' },
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

    const carousel = await Carousel.findByIdAndDelete(id);

    if (!carousel) {
      return NextResponse.json(
        { error: 'Carousel bulunamadı' },
        { 
          status: 404,
          headers: getCorsHeaders(request),
        }
      );
    }

    return NextResponse.json({ message: 'Carousel silindi' }, {
      headers: getCorsHeaders(request),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Carousel silinemedi' },
      { 
        status: 500,
        headers: getCorsHeaders(request),
      }
    );
  }
}

