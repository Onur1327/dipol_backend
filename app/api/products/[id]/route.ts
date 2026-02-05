import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Product from '@/models/Product';
import { getCurrentUser } from '@/lib/auth';
import { getCorsHeaders } from '@/lib/cors';
import mongoose from 'mongoose';

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
    await connectDB();

    const { id } = await params;
    
    let product = null;
    
    // Eğer geçerli bir ObjectId ise, önce ID olarak dene
    if (mongoose.Types.ObjectId.isValid(id)) {
      product = await Product.findById(id).populate('category', 'name slug').lean();
    }
    
    // Bulunamadıysa veya geçerli ObjectId değilse, slug olarak ara
    if (!product) {
      product = await Product.findOne({ slug: id }).populate('category', 'name slug').lean();
    }
    
    if (!product) {
      return NextResponse.json(
        { error: 'Ürün bulunamadı' },
        { 
          status: 404,
          headers: getCorsHeaders(request),
        }
      );
    }

    // colorImages Map'ini object'e dönüştür
    const productObj: any = product.toObject ? product.toObject() : product;
    
    // Images array'ini kontrol et
    if (!productObj.images || !Array.isArray(productObj.images)) {
      productObj.images = [];
    }
    
    if (productObj.colorImages && productObj.colorImages instanceof Map) {
      const colorImagesObj: { [color: string]: string[] } = {};
      productObj.colorImages.forEach((images: string[], color: string) => {
        colorImagesObj[color] = Array.isArray(images) ? images : [];
      });
      productObj.colorImages = colorImagesObj;
    } else if (productObj.colorImages && typeof productObj.colorImages === 'object' && !Array.isArray(productObj.colorImages)) {
      // Zaten object ise, array kontrolü yap
      Object.keys(productObj.colorImages).forEach((color: string) => {
        if (!Array.isArray(productObj.colorImages[color])) {
          productObj.colorImages[color] = [];
        }
      });
    }

    // colorSizeStock Map'ini object'e dönüştür
    if (productObj.colorSizeStock && productObj.colorSizeStock instanceof Map) {
      const colorSizeStockObj: { [color: string]: { [size: string]: number } } = {};
      productObj.colorSizeStock.forEach((sizeMap: Map<string, number>, color: string) => {
        if (sizeMap instanceof Map) {
          colorSizeStockObj[color] = Object.fromEntries(sizeMap);
        } else {
          colorSizeStockObj[color] = sizeMap;
        }
      });
      productObj.colorSizeStock = colorSizeStockObj;
    }

    return NextResponse.json(productObj, {
      headers: getCorsHeaders(request),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Ürün getirilemedi' },
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
    
    // Request body'yi text olarak al ve size kontrolü yap
    const bodyText = await request.text();
    
    // Vercel'in body size limit'i 4.5MB, biz 4MB ile sınırlayalım
    const maxBodySize = 4 * 1024 * 1024; // 4MB
    if (bodyText.length > maxBodySize) {
      return NextResponse.json(
        { error: 'İstek çok büyük. Görselleri optimize edin veya daha az görsel ekleyin.' },
        { 
          status: 413,
          headers: getCorsHeaders(request),
        }
      );
    }
    
    const body = JSON.parse(bodyText);
    
    // Slug unique kontrolü (mevcut ürün hariç)
    if (body.slug) {
      let baseSlug = body.slug.toLowerCase().trim();
      // Türkçe karakterleri değiştir ve özel karakterleri temizle
      baseSlug = baseSlug
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ı/g, 'i')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      
      // Slug unique kontrolü - mevcut ürün hariç
      let finalSlug = baseSlug;
      let counter = 1;
      let existingProduct = await Product.findOne({ slug: finalSlug, _id: { $ne: id } });
      while (existingProduct) {
        finalSlug = `${baseSlug}-${counter}`;
        counter++;
        existingProduct = await Product.findOne({ slug: finalSlug, _id: { $ne: id } });
      }
      body.slug = finalSlug;
    }
    
    // colorImages'ı Map formatına dönüştür
    if (body.colorImages && typeof body.colorImages === 'object' && !(body.colorImages instanceof Map)) {
      const colorImagesMap = new Map();
      Object.entries(body.colorImages).forEach(([color, images]) => {
        colorImagesMap.set(color, images);
      });
      body.colorImages = colorImagesMap;
    }
    
    // colorSizeStock'u Map formatına dönüştür
    if (body.colorSizeStock && typeof body.colorSizeStock === 'object' && !(body.colorSizeStock instanceof Map)) {
      const colorSizeStockMap = new Map();
      Object.entries(body.colorSizeStock).forEach(([color, sizeMap]: [string, any]) => {
        if (sizeMap && typeof sizeMap === 'object') {
          const sizeMapObj = new Map();
          Object.entries(sizeMap).forEach(([size, stock]: [string, any]) => {
            sizeMapObj.set(size, stock);
          });
          colorSizeStockMap.set(color, sizeMapObj);
        }
      });
      body.colorSizeStock = colorSizeStockMap;
    }
    
    // Images array'ini kontrol et ve düzelt
    if (!body.images || !Array.isArray(body.images)) {
      body.images = [];
    } else {
      // Boş string'leri filtrele
      body.images = body.images.filter((img: string) => img && img.trim().length > 0);
    }
    
    const product = await Product.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    }).populate('category', 'name slug');

    if (!product) {
      return NextResponse.json(
        { error: 'Ürün bulunamadı' },
        { 
          status: 404,
          headers: getCorsHeaders(request),
        }
      );
    }

    // colorImages Map'ini object'e dönüştür
    const productObj: any = product.toObject ? product.toObject() : product;
    
    // Images array'ini kontrol et
    if (!productObj.images || !Array.isArray(productObj.images)) {
      productObj.images = [];
    }
    
    if (productObj.colorImages && productObj.colorImages instanceof Map) {
      const colorImagesObj: { [color: string]: string[] } = {};
      productObj.colorImages.forEach((images: string[], color: string) => {
        colorImagesObj[color] = Array.isArray(images) ? images : [];
      });
      productObj.colorImages = colorImagesObj;
    } else if (productObj.colorImages && typeof productObj.colorImages === 'object' && !Array.isArray(productObj.colorImages)) {
      // Zaten object ise, array kontrolü yap
      Object.keys(productObj.colorImages).forEach((color: string) => {
        if (!Array.isArray(productObj.colorImages[color])) {
          productObj.colorImages[color] = [];
        }
      });
    }

    // colorSizeStock Map'ini object'e dönüştür
    if (productObj.colorSizeStock && productObj.colorSizeStock instanceof Map) {
      const colorSizeStockObj: { [color: string]: { [size: string]: number } } = {};
      productObj.colorSizeStock.forEach((sizeMap: Map<string, number>, color: string) => {
        if (sizeMap instanceof Map) {
          colorSizeStockObj[color] = Object.fromEntries(sizeMap);
        } else {
          colorSizeStockObj[color] = sizeMap;
        }
      });
      productObj.colorSizeStock = colorSizeStockObj;
    }

    return NextResponse.json(productObj, {
      headers: getCorsHeaders(request),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Ürün güncellenemedi' },
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
    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      return NextResponse.json(
        { error: 'Ürün bulunamadı' },
        { 
          status: 404,
          headers: getCorsHeaders(request),
        }
      );
    }

    return NextResponse.json({ message: 'Ürün silindi' }, {
      headers: getCorsHeaders(request),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Ürün silinemedi' },
      { 
        status: 500,
        headers: getCorsHeaders(request),
      }
    );
  }
}

