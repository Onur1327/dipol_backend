import { NextResponse } from 'next/server';
import connectDB from '../../../lib/mongodb.js';
import Carousel from '../../../models/Carousel.js';
import { getCurrentUser } from '../../../lib/auth.js';
import { getCorsHeaders } from '../../../lib/cors.js';

export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeaders(request),
  });
}

export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    const query = {};
    if (activeOnly) query.active = true;

    const carousels = await Carousel.find(query).sort({ order: 1, createdAt: -1 }).lean();
    return NextResponse.json({ carousels }, { headers: getCorsHeaders(request) });
  } catch (error) {
    return NextResponse.json({ error: error.message, stack: error.stack, details: error.toString() }, { status: 500, headers: getCorsHeaders(request) });
  }
}

export async function POST(request) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401, headers: getCorsHeaders(request) });
    }

    await connectDB();
    const body = await request.json();
    const carousel = await Carousel.create(body);
    return NextResponse.json(carousel, { status: 201, headers: getCorsHeaders(request) });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Carousel oluşturulamadı' }, { status: 500, headers: getCorsHeaders(request) });
  }
}

