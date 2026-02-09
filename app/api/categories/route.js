import { NextResponse } from 'next/server';
import connectDB from '../../../lib/mongodb.js';
import Category from '../../../models/Category.js';
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
    const parentOnly = searchParams.get('parentOnly') === 'true';
    const parentId = searchParams.get('parentId');
    const ids = searchParams.get('ids');

    let user = null;
    try {
      user = await getCurrentUser(request);
    } catch (authError) { }

    const query = {};
    if (!user || user.role !== 'admin') {
      query.active = { $ne: false };
    }

    if (ids) {
      const idArray = ids.split(',').map(id => id.trim()).filter(Boolean);
      if (idArray.length > 0) query._id = { $in: idArray };
    } else if (parentOnly) {
      query.$or = [{ parent: null }, { parent: { $exists: false } }];
    } else if (parentId) {
      query.parent = parentId;
    }

    const categories = await Category.find(query)
      .populate('parent', 'name slug')
      .sort({ order: 1, name: 1 })
      .lean();

    return NextResponse.json({ categories }, { headers: getCorsHeaders(request) });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Kategoriler getirilemedi' },
      { status: 500, headers: getCorsHeaders(request) }
    );
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
    if (body.parent === '' || body.parent === null || body.parent === undefined) body.parent = null;

    const category = await Category.create(body);
    return NextResponse.json(category, { status: 201, headers: getCorsHeaders(request) });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Kategori oluşturulamadı' }, { status: 500, headers: getCorsHeaders(request) });
  }
}

