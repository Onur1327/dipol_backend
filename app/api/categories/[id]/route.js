import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb.js';
import Category from '../../../../models/Category.js';
import { getCurrentUser } from '../../../../lib/auth.js';
import { getCorsHeaders } from '../../../../lib/cors.js';

export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeaders(request),
  });
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
    if (body.parent === '' || body.parent === null || body.parent === undefined) body.parent = null;

    const category = await Category.findByIdAndUpdate(id, body, { new: true, runValidators: true });
    if (!category) return NextResponse.json({ error: 'Kategori bulunamadı' }, { status: 404, headers: getCorsHeaders(request) });

    return NextResponse.json(category, { headers: getCorsHeaders(request) });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Kategori güncellenemedi' }, { status: 500, headers: getCorsHeaders(request) });
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
    const category = await Category.findByIdAndDelete(id);
    if (!category) return NextResponse.json({ error: 'Kategori bulunamadı' }, { status: 404, headers: getCorsHeaders(request) });

    return NextResponse.json({ message: 'Kategori silindi' }, { headers: getCorsHeaders(request) });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Kategori silinemedi' }, { status: 500, headers: getCorsHeaders(request) });
  }
}

