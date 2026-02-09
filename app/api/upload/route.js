import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../lib/auth.js';
import { getCorsHeaders } from '../../../lib/cors.js';

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

    const body = await request.json();
    const { image, filename } = body;

    if (!image) return NextResponse.json({ error: 'Görsel verisi gereklidir' }, { status: 400, headers: getCorsHeaders(request) });

    let base64Data = image;
    if (image.startsWith('data:image')) base64Data = image.split(',')[1];

    if (!/^[A-Za-z0-9+/=]+$/.test(base64Data)) return NextResponse.json({ error: 'Geçersiz base64 formatı' }, { status: 400, headers: getCorsHeaders(request) });

    const sizeInBytes = (base64Data.length * 3) / 4;
    const maxSize = 5 * 1024 * 1024;

    if (sizeInBytes > maxSize) return NextResponse.json({ error: 'Görsel boyutu çok büyük. Maksimum 5MB olmalıdır.' }, { status: 400, headers: getCorsHeaders(request) });

    const imageDataUrl = image.startsWith('data:image') ? image : `data:image/webp;base64,${base64Data}`;

    return NextResponse.json({
      success: true,
      image: imageDataUrl,
      filename: filename || 'uploaded-image.jpg',
      size: sizeInBytes,
    }, { headers: getCorsHeaders(request) });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Görsel yüklenemedi' }, { status: 500, headers: getCorsHeaders(request) });
  }
}

