import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Product from '@/models/Product';
import Category from '@/models/Category';
import { getCurrentUser } from '@/lib/auth';
import { getCorsHeaders } from '@/lib/cors';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    // MongoDB bağlantısını kontrol et
    try {
      await connectDB();
      console.log('[Products GET] MongoDB connected');
    } catch (dbError: any) {
      console.error('[Products GET] MongoDB connection error:', dbError?.message);
      throw new Error(`Veritabanı bağlantı hatası: ${dbError?.message || 'Bilinmeyen hata'}`);
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const featured = searchParams.get('featured');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    let limit = parseInt(searchParams.get('limit') || '12');
    
    // Limit'i maksimum 1000 ile sınırla (çok büyük limit'ler performans sorunlarına yol açabilir)
    if (limit > 1000) {
      limit = 1000;
    }
    
    const skip = (page - 1) * limit;

    const query: any = {};
    
    // Admin kullanıcıları için status filtresi yok, tüm ürünleri görebilirler
    // Normal kullanıcılar için sadece aktif ürünleri göster
    let user = null;
    try {
      user = await getCurrentUser(request);
    } catch (authError: any) {
      // Token yoksa veya hata varsa sadece aktif ürünleri göster
      console.log('[Products GET] Auth check failed (expected for non-admin):', authError?.message || 'No token');
    }
    
    if (!user || user.role !== 'admin') {
      query.status = 'active';
    }

    if (category) {
      // Kategori ID'si veya slug'ı ile filtrele
      let categoryId: mongoose.Types.ObjectId | null = null;
      
      if (mongoose.Types.ObjectId.isValid(category)) {
        // Parametre geçerli bir ObjectId ise, doğrudan bunu kullan
        categoryId = new mongoose.Types.ObjectId(category);
      } else {
        // Geçerli bir ObjectId değilse, bunu slug olarak kabul et
        const cat = await Category.findOne({ slug: category }).lean();
        if (cat) {
          categoryId = cat._id;
        }
      }
      
      if (categoryId) {
        // Seçilen kategorinin alt kategorilerini bul
        const subCategories = await Category.find({ 
          parent: categoryId 
        }).select('_id').lean();
        
        // Alt kategori ID'lerini topla
        const categoryIds = [categoryId];
        subCategories.forEach(subCat => {
          categoryIds.push(subCat._id);
        });
        
        // Hem ana kategoriye hem de alt kategorilere atanmış ürünleri göster
        query.category = { $in: categoryIds };
      } else {
        // Kategori bulunamazsa hiç ürün döndürme
        query.category = new mongoose.Types.ObjectId('000000000000000000000000');
      }
    }

    if (featured === 'true') {
      query.featured = true;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Query'yi logla (debug için - ObjectId'leri string'e çevir)
    try {
      const queryForLog = JSON.parse(JSON.stringify(query, (key, value) => {
        if (value instanceof mongoose.Types.ObjectId) {
          return value.toString();
        }
        return value;
      }));
      console.log('[Products GET] Query:', queryForLog);
    } catch (logError) {
      console.log('[Products GET] Query (simplified):', { status: query.status, category: query.category ? 'set' : 'not set' });
    }
    console.log('[Products GET] User role:', user?.role || 'guest');
    console.log('[Products GET] Limit:', limit, 'Skip:', skip);
    
    let products;
    try {
      // Normal find kullan ama _id ile sort yap (createdAt yerine - daha hızlı, index var)
      // _id zaten zaman bazlı olduğu için son eklenenler önce gelir
      products = await Product.find(query)
        .select('name slug price comparePrice images stock featured status category createdAt')
        .populate('category', 'name slug')
        .sort({ _id: -1 }) // createdAt yerine _id kullan (daha hızlı, bellek limiti sorunu yok)
        .skip(skip)
        .limit(limit)
        .lean();
      console.log('[Products GET] Found products:', products.length);
    } catch (findError: any) {
      console.error('[Products GET] Product.find error:', findError?.message);
      console.error('[Products GET] Error stack:', findError?.stack);
      
      // Fallback: Sort olmadan sadece limit ile al
      try {
        console.log('[Products GET] Trying fallback without sort...');
        products = await Product.find(query)
          .select('name slug price comparePrice images stock featured status category createdAt')
          .populate('category', 'name slug')
          .limit(limit)
          .lean();
        // Son eklenenler önce gelsin diye manuel sort yap
        products.sort((a: any, b: any) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bTime - aTime;
        });
        console.log('[Products GET] Fallback successful, products:', products.length);
      } catch (fallbackError: any) {
        console.error('[Products GET] Fallback also failed:', fallbackError?.message);
        throw new Error(`Ürün sorgusu başarısız: ${findError?.message || 'Bilinmeyen hata'}`);
      }
    }

    // Images array'ini güvenli şekilde normalize et
    let processedProducts;
    try {
      processedProducts = products.map((product: any) => {
        return {
          ...product,
          images: Array.isArray(product.images)
            ? product.images.filter((img: string) => !!img && typeof img === 'string')
            : [],
        };
      });
    } catch (processError: any) {
      console.error('[Products GET] Product processing error:', processError?.message);
      throw new Error(`Ürün işleme hatası: ${processError?.message || 'Bilinmeyen hata'}`);
    }

    let total;
    try {
      // countDocuments sort yapmadığı için allowDiskUse gerekmez
      total = await Product.countDocuments(query);
      console.log('[Products GET] Total products:', total);
    } catch (countError: any) {
      console.error('[Products GET] Product.countDocuments error:', countError?.message);
      // Count hatası kritik değil, total'i products.length olarak ayarla
      total = products.length;
    }
    
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
  } catch (error: any) {
    // Hatanın sebebini terminalde görebilmek için detaylı logla
    console.error('❌ Products GET error:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    });
    
    // Production'da da hata mesajını göster (güvenlik açısından sorun yok, sadece backend logları)
    const errorMessage = error?.message || 'Ürünler getirilemedi';
    
    return NextResponse.json(
      { 
        error: errorMessage,
        // Stack trace'i sadece development'ta göster
        ...(process.env.NODE_ENV === 'development' && { 
          details: error?.stack,
          name: error?.name,
        }),
      },
      { 
        status: 500,
        headers: getCorsHeaders(request),
      }
    );
  }
}

// OPTIONS handler for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeaders(request),
  });
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    
    // Slug unique kontrolü ve otomatik slug oluşturma
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
      
      // Slug unique kontrolü - eğer varsa sonuna sayı ekle
      let finalSlug = baseSlug;
      let counter = 1;
      while (await Product.findOne({ slug: finalSlug })) {
        finalSlug = `${baseSlug}-${counter}`;
        counter++;
      }
      body.slug = finalSlug;
    } else if (body.name) {
      // Slug yoksa name'den oluştur
      let baseSlug = body.name.toLowerCase().trim();
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
      
      // Slug unique kontrolü
      let finalSlug = baseSlug;
      let counter = 1;
      while (await Product.findOne({ slug: finalSlug })) {
        finalSlug = `${baseSlug}-${counter}`;
        counter++;
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
    
    // Eğer images boşsa ama colorImages varsa, ilk colorImages'dan bir görsel al
    if (body.images.length === 0 && body.colorImages && typeof body.colorImages === 'object') {
      const colorImagesObj = body.colorImages instanceof Map 
        ? Object.fromEntries(body.colorImages) 
        : body.colorImages;
      const firstColor = Object.keys(colorImagesObj)[0];
      if (firstColor && colorImagesObj[firstColor] && Array.isArray(colorImagesObj[firstColor]) && colorImagesObj[firstColor].length > 0) {
        body.images = [colorImagesObj[firstColor][0]];
      }
    }
    
    console.log('[PRODUCT CREATE] Images:', body.images);
    console.log('[PRODUCT CREATE] ColorImages:', body.colorImages);
    
    const product = await Product.create(body);

    return NextResponse.json(product, { 
      status: 201,
      headers: getCorsHeaders(request),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Ürün oluşturulamadı' },
      { 
        status: 500,
        headers: getCorsHeaders(request),
      }
    );
  }
}

