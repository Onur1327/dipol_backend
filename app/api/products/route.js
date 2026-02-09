import { NextResponse } from 'next/server';
import connectDB from '../../../lib/mongodb.js';
import Product from '../../../models/Product.js';
import Category from '../../../models/Category.js';
import { getCurrentUser } from '../../../lib/auth.js';
import { getCorsHeaders } from '../../../lib/cors.js';
import mongoose from 'mongoose';

export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const featured = searchParams.get('featured');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    let limit = parseInt(searchParams.get('limit') || '12');

    if (limit > 1000) limit = 1000;
    const skip = (page - 1) * limit;

    const query = {};
    let user = null;
    try {
      user = await getCurrentUser(request);
    } catch (authError) { }

    if (!user || user.role !== 'admin') {
      query.status = 'active';
    }

    if (category) {
      let categoryId = null;
      if (mongoose.Types.ObjectId.isValid(category)) {
        categoryId = new mongoose.Types.ObjectId(category);
      } else {
        const cat = await Category.findOne({ slug: category }).lean();
        if (cat) categoryId = cat._id;
      }

      if (categoryId) {
        const subCategories = await Category.find({ parent: categoryId }).select('_id').lean();
        const categoryIds = [categoryId, ...subCategories.map(subCat => subCat._id)];
        query.category = { $in: categoryIds };
      } else {
        query.category = new mongoose.Types.ObjectId('000000000000000000000000');
      }
    }

    if (featured === 'true') query.featured = true;

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const onSale = searchParams.get('onSale');
    if (onSale === 'true') {
      query.comparePrice = { $gt: 0 };
      query.$expr = { $gt: ["$comparePrice", "$price"] };
    }

    const products = await Product.find(query)
      .select('name slug price comparePrice images stock featured status category createdAt')
      .populate('category', 'name slug')
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const processedProducts = products.map(product => ({
      ...product,
      images: Array.isArray(product.images) ? product.images.filter(img => !!img) : [],
    }));

    const total = await Product.countDocuments(query);

    return NextResponse.json({
      products: processedProducts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }, {
      headers: getCorsHeaders(request),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Ürünler getirilemedi' },
      { status: 500, headers: getCorsHeaders(request) }
    );
  }
}

export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeaders(request),
  });
}

export async function POST(request) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401, headers: getCorsHeaders(request) });
    }

    await connectDB();
    const body = await request.json();

    if (body.slug || body.name) {
      let baseSlug = (body.slug || body.name).toLowerCase().trim();
      baseSlug = baseSlug
        .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
        .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
        .replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

      let finalSlug = baseSlug;
      const slugRegex = new RegExp(`^${baseSlug}(-[0-9]*)?$`, 'i');
      const productsWithSlug = await Product.find({ slug: slugRegex }).select('slug');

      if (productsWithSlug.length > 0) {
        const slugs = productsWithSlug.map(p => p.slug);
        let counter = 0;

        while (slugs.includes(counter === 0 ? baseSlug : `${baseSlug}-${counter}`)) {
          counter++;
        }

        finalSlug = counter === 0 ? baseSlug : `${baseSlug}-${counter}`;
      }
      body.slug = finalSlug;
    }

    if (body.colorImages && typeof body.colorImages === 'object' && !(body.colorImages instanceof Map)) {
      body.colorImages = new Map(Object.entries(body.colorImages));
    }

    if (body.colorSizeStock && typeof body.colorSizeStock === 'object' && !(body.colorSizeStock instanceof Map)) {
      const colorSizeStockMap = new Map();
      Object.entries(body.colorSizeStock).forEach(([color, sizeMap]) => {
        if (sizeMap && typeof sizeMap === 'object') {
          colorSizeStockMap.set(color, new Map(Object.entries(sizeMap)));
        }
      });
      body.colorSizeStock = colorSizeStockMap;
    }

    body.images = Array.isArray(body.images) ? body.images.filter(img => img && img.trim().length > 0) : [];

    const product = await Product.create(body);
    return NextResponse.json(product, { status: 201, headers: getCorsHeaders(request) });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Ürün oluşturulamadı' }, { status: 500, headers: getCorsHeaders(request) });
  }
}

