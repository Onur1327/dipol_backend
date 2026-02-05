import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getCorsHeaders } from '@/lib/cors';

/**
 * Görsel yükleme endpoint'i
 * Görselleri base64 formatında database'de saklamak için kullanılır
 */
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

    const body = await request.json();
    const { image, filename } = body;

    if (!image) {
      return NextResponse.json(
        { error: 'Görsel verisi gereklidir' },
        {
          status: 400,
          headers: getCorsHeaders(request),
        }
      );
    }

    // Base64 formatını kontrol et
    let base64Data = image;
    if (image.startsWith('data:image')) {
      // data:image/png;base64, prefix'ini kaldır
      base64Data = image.split(',')[1];
    }

    // Base64 verisini doğrula
    if (!/^[A-Za-z0-9+/=]+$/.test(base64Data)) {
      return NextResponse.json(
        { error: 'Geçersiz base64 formatı' },
        {
          status: 400,
          headers: getCorsHeaders(request),
        }
      );
    }

    // Görsel boyutunu kontrol et (max 5MB)
    const sizeInBytes = (base64Data.length * 3) / 4;
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (sizeInBytes > maxSize) {
      return NextResponse.json(
        { error: 'Görsel boyutu çok büyük. Maksimum 5MB olmalıdır.' },
        {
          status: 400,
          headers: getCorsHeaders(request),
        }
      );
    }

    // Base64 verisini data URL formatına çevir (saklama için)
    const imageDataUrl = image.startsWith('data:image')
      ? image
      : `data:image/webp;base64,${base64Data}`;

    // Görsel bilgilerini döndür
    return NextResponse.json({
      success: true,
      image: imageDataUrl,
      filename: filename || 'uploaded-image.jpg',
      size: sizeInBytes,
    }, {
      headers: getCorsHeaders(request),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Görsel yüklenemedi' },
      {
        status: 500,
        headers: getCorsHeaders(request),
      }
    );
  }
}

