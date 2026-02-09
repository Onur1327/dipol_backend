import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb.js';
import Product from '../../../../models/Product.js';
import { getCurrentUser } from '../../../../lib/auth.js';
import { getCorsHeaders } from '../../../../lib/cors.js';
import mongoose from 'mongoose';

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
    let product = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      product = await Product.findById(id).populate('category', 'name slug').lean();
    }

    if (!product) {
      product = await Product.findOne({ slug: id }).populate('category', 'name slug').lean();
    }

    if (!product) {
      return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404, headers: getCorsHeaders(request) });
    }

    const productObj = product.toObject ? product.toObject() : product;
    if (!productObj.images || !Array.isArray(productObj.images)) productObj.images = [];

    if (productObj.colorImages && productObj.colorImages instanceof Map) {
      const colorImagesObj = {};
      productObj.colorImages.forEach((images, color) => {
        colorImagesObj[color] = Array.isArray(images) ? images : [];
      });
      productObj.colorImages = colorImagesObj;
    } else if (productObj.colorImages && typeof productObj.colorImages === 'object' && !Array.isArray(productObj.colorImages)) {
      Object.keys(productObj.colorImages).forEach(color => {
        if (!Array.isArray(productObj.colorImages[color])) productObj.colorImages[color] = [];
      });
    }

    if (productObj.colorSizeStock && productObj.colorSizeStock instanceof Map) {
      const colorSizeStockObj = {};
      productObj.colorSizeStock.forEach((sizeMap, color) => {
        colorSizeStockObj[color] = sizeMap instanceof Map ? Object.fromEntries(sizeMap) : sizeMap;
      });
      productObj.colorSizeStock = colorSizeStockObj;
    }

    return NextResponse.json(productObj, { headers: getCorsHeaders(request) });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Ürün getirilemedi' }, { status: 500, headers: getCorsHeaders(request) });
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
    const bodyText = await request.text();
    const maxBodySize = 4 * 1024 * 1024;
    if (bodyText.length > maxBodySize) {
      return NextResponse.json({ error: 'İstek çok büyük. Görselleri optimize edin veya daha az görsel ekleyin.' }, { status: 413, headers: getCorsHeaders(request) });
    }

    const body = JSON.parse(bodyText);

    if (body.slug) {
      let baseSlug = body.slug.toLowerCase().trim()
        .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
        .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
        .replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

      let finalSlug = baseSlug;
      let counter = 1;
      const slugRegex = new RegExp(`^${baseSlug}(-[0-9]*)?$`, 'i');
      const existingProducts = await Product.find({ slug: slugRegex, _id: { $ne: id } }).select('slug');

      if (existingProducts.length > 0) {
        const slugs = existingProducts.map(p => p.slug);
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

    if (!body.images || !Array.isArray(body.images)) {
      body.images = [];
    } else {
      body.images = body.images.filter(img => img && img.trim().length > 0);
    }

    const product = await Product.findByIdAndUpdate(id, body, { new: true, runValidators: true }).populate('category', 'name slug');
    if (!product) return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404, headers: getCorsHeaders(request) });

    const productObj = product.toObject ? product.toObject() : product;
    if (!productObj.images || !Array.isArray(productObj.images)) productObj.images = [];

    if (productObj.colorImages && productObj.colorImages instanceof Map) {
      const colorImagesObj = {};
      productObj.colorImages.forEach((images, color) => {
        colorImagesObj[color] = Array.isArray(images) ? images : [];
      });
      productObj.colorImages = colorImagesObj;
    }

    if (productObj.colorSizeStock && productObj.colorSizeStock instanceof Map) {
      const colorSizeStockObj = {};
      productObj.colorSizeStock.forEach((sizeMap, color) => {
        colorSizeStockObj[color] = sizeMap instanceof Map ? Object.fromEntries(sizeMap) : sizeMap;
      });
      productObj.colorSizeStock = colorSizeStockObj;
    }

    return NextResponse.json(productObj, { headers: getCorsHeaders(request) });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Ürün güncellenemedi' }, { status: 500, headers: getCorsHeaders(request) });
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
    const product = await Product.findByIdAndDelete(id);
    if (!product) return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404, headers: getCorsHeaders(request) });

    return NextResponse.json({ message: 'Ürün silindi' }, { headers: getCorsHeaders(request) });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Ürün silinemedi' }, { status: 500, headers: getCorsHeaders(request) });
  }
}

