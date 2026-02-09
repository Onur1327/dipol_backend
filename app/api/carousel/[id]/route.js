import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb.js';
import Carousel from '../../../../models/Carousel.js';
import { getCurrentUser } from '../../../../lib/auth.js';
import { getCorsHeaders } from '../../../../lib/cors.js';

export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeaders(request),
  });
}

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const carousel = await Carousel.findById(id).lean();
    if (!carousel) return NextResponse.json({ error: 'Carousel bulunamadı' }, { status: 404, headers: getCorsHeaders(request) });

    return NextResponse.json(carousel, { headers: getCorsHeaders(request) });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Carousel getirilemedi' }, { status: 500, headers: getCorsHeaders(request) });
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
    const carousel = await Carousel.findByIdAndUpdate(id, body, { new: true, runValidators: true });
    if (!carousel) return NextResponse.json({ error: 'Carousel bulunamadı' }, { status: 404, headers: getCorsHeaders(request) });

    return NextResponse.json(carousel, { headers: getCorsHeaders(request) });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Carousel güncellenemedi' }, { status: 500, headers: getCorsHeaders(request) });
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
    const carousel = await Carousel.findByIdAndDelete(id);
    if (!carousel) return NextResponse.json({ error: 'Carousel bulunamadı' }, { status: 404, headers: getCorsHeaders(request) });

    return NextResponse.json({ message: 'Carousel silindi' }, { headers: getCorsHeaders(request) });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Carousel silinemedi' }, { status: 500, headers: getCorsHeaders(request) });
  }
}

