import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Category from '@/models/Category';
import { getCurrentUser } from '@/lib/auth';
import { getCorsHeaders } from '@/lib/cors';

// OPTIONS handler for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeaders(request),
  });
}

export async function GET(request: NextRequest) {
  try {
    // MongoDB bağlantısını kontrol et
    try {
      await connectDB();
      console.log('[Categories GET] MongoDB connected');
    } catch (dbError: any) {
      console.error('[Categories GET] MongoDB connection error:', dbError?.message);
      throw new Error(`Veritabanı bağlantı hatası: ${dbError?.message || 'Bilinmeyen hata'}`);
    }

    const { searchParams } = new URL(request.url);
    const parentOnly = searchParams.get('parentOnly') === 'true';
    const parentId = searchParams.get('parentId');
    const ids = searchParams.get('ids');

    // Admin kullanıcıları için tüm kategorileri göster, normal kullanıcılar için sadece aktifleri
    let user = null;
    try {
      user = await getCurrentUser(request);
      console.log('[Categories GET] User role:', user?.role || 'guest');
    } catch (authError: any) {
      // Token yoksa veya hata varsa sadece aktif kategorileri göster
      console.log('[Categories GET] Auth check failed (expected for non-admin):', authError?.message || 'No token');
    }
    
    const query: any = {};
    
    // Admin değilse sadece aktif kategorileri göster
    if (!user || user.role !== 'admin') {
      query.active = { $ne: false };
    }
    
    if (ids) {
      // IDs parametresi varsa, virgülle ayrılmış ID'leri kullan
      const idArray = ids.split(',').map((id: string) => id.trim()).filter(Boolean);
      if (idArray.length > 0) {
        query._id = { $in: idArray };
      }
    } else if (parentOnly) {
      // Ana kategoriler için: parent null veya undefined olanlar
      query.$or = [
        { parent: null },
        { parent: { $exists: false } }
      ];
    } else if (parentId) {
      query.parent = parentId;
    }

    console.log('[Categories GET] Query:', JSON.stringify(query, null, 2));
    console.log('[Categories GET] Params:', { parentOnly, parentId, ids });

    let categories;
    try {
      categories = await Category.find(query)
        .populate('parent', 'name slug')
        .sort({ order: 1, name: 1 })
        .lean();
      console.log('[Categories GET] Found categories:', categories.length);
    } catch (findError: any) {
      console.error('[Categories GET] Category.find error:', findError?.message, findError?.stack);
      throw new Error(`Kategori sorgusu başarısız: ${findError?.message || 'Bilinmeyen hata'}`);
    }
    
    return NextResponse.json({ categories }, {
      headers: getCorsHeaders(request),
    });
  } catch (error: any) {
    // Hatanın sebebini terminalde görebilmek için detaylı logla
    console.error('❌ Categories GET error:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    });
    
    return NextResponse.json(
      { 
        error: error?.message || 'Kategoriler getirilemedi',
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
    
    // parent boş string ise null yap
    if (body.parent === '' || body.parent === null || body.parent === undefined) {
      body.parent = null;
    }
    
    const category = await Category.create(body);

    return NextResponse.json(category, { 
      status: 201,
      headers: getCorsHeaders(request),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Kategori oluşturulamadı' },
      { 
        status: 500,
        headers: getCorsHeaders(request),
      }
    );
  }
}

