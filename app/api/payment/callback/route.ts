import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getCorsHeaders } from '@/lib/cors';
import Order from '@/models/Order';
import Product from '@/models/Product';
import { auth3D } from '@/lib/iyzipay';
import crypto from 'crypto';

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeaders(request),
  });
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Iyzico 3D callback'leri genellikle x-www-form-urlencoded gelir
    const contentType = request.headers.get('content-type') || '';
    let body: any = {};

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      formData.forEach((value, key) => {
        body[key] = value;
      });
    } else {
      body = await request.json();
    }

    const {
      paymentId,
      status, // 'success' veya 'failure'
      conversationId, // basketId (orderId)
      mdStatus, // 1: Başarılı, 0,2,3...: Başarısız
    } = body;

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';

    // Siparişi bul
    if (!conversationId) {
      return NextResponse.redirect(`${frontendUrl}/sepet?error=SiparisIDBulunamadi`, 303);
    }

    const order = await Order.findById(conversationId);
    if (!order) {
      return NextResponse.redirect(`${frontendUrl}/sepet?error=SiparisBulunamadi`, 303);
    }

    // Ödeme durumunu güncelle
    if (status === 'success' && (mdStatus === '1' || mdStatus === 1)) {
      // 3D Ödemeyi Onayla (Auth) - SDK ile
      const authResult: any = await auth3D(paymentId, conversationId);

      if (authResult.status !== 'success') {
        await Order.findByIdAndUpdate(conversationId, {
          paymentStatus: 'failed',
          paymentId: paymentId,
          paymentDetails: authResult,
          paymentError: authResult.errorMessage || 'Ödeme doğrulanamadı (Auth hatası)',
        });
        return NextResponse.redirect(`${frontendUrl}/odeme?error=DogrulamaHatasi`, 303);
      }

      // Ödeme başarılı - Zaten paid ise tekrar işlem yapma (idempotency)
      if (order.paymentStatus !== 'paid') {
        await Order.findByIdAndUpdate(conversationId, {
          paymentStatus: 'paid',
          orderStatus: 'processing',
          paymentId: paymentId,
          paymentDetails: authResult,
        });

        // Stok güncelleme
        for (const item of order.items) {
          const product = await Product.findById(item.product);
          if (!product) continue;

          if (item.color && item.size && product.colorSizeStock) {
            // Renk ve beden bazlı stok düşme
            if (product.colorSizeStock instanceof Map) {
              const colorStock = product.colorSizeStock.get(item.color);
              if (colorStock) {
                const currentStock = colorStock.get(item.size) || 0;
                colorStock.set(item.size, Math.max(0, currentStock - item.quantity));
                product.colorSizeStock.set(item.color, colorStock);
                await product.save();
              }
            } else {
              const colorStock = (product.colorSizeStock as any)[item.color];
              if (colorStock) {
                const currentStock = colorStock[item.size] || 0;
                colorStock[item.size] = Math.max(0, currentStock - item.quantity);
                (product.colorSizeStock as any)[item.color] = colorStock;
                await product.save();
              }
            }
          } else {
            // Genel stok düşme
            await Product.findByIdAndUpdate(item.product, {
              $inc: { stock: -item.quantity },
            });
          }
        }
      }

      // Başarılı sayfasına yönlendir
      return NextResponse.redirect(`${frontendUrl}/siparisler?success=true&orderId=${conversationId}`, 303);
    } else {
      // Ödeme başarısız
      await Order.findByIdAndUpdate(conversationId, {
        paymentStatus: 'failed',
        paymentId: paymentId,
        paymentDetails: body,
        paymentError: body.errorMessage || '3D Onayı alınamadı',
      });

      // Sepet sayfasına hata ile dön
      return NextResponse.redirect(`${frontendUrl}/odeme?error=OdemeBasarisiz`, 303);
    }
  } catch (error: any) {
    console.error('İyzico callback hatası:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';

    // Redirect with error
    const response = NextResponse.redirect(`${frontendUrl}/sepet?error=SistemselHata`, 303);

    try {
      const headers = getCorsHeaders(request);
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
    } catch (e) {
      response.headers.set('Access-Control-Allow-Origin', '*');
    }

    return response;
  }
}

