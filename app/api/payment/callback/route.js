import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb.js';
import { getCorsHeaders } from '../../../../lib/cors.js';
import Order from '../../../../models/Order.js';
import Product from '../../../../models/Product.js';
import { auth3D } from '../../../../lib/iyzipay.js';

export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeaders(request),
  });
}

export async function POST(request) {
  try {
    await connectDB();
    const contentType = request.headers.get('content-type') || '';
    let body = {};

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      formData.forEach((value, key) => { body[key] = value; });
    } else {
      body = await request.json();
    }

    const { paymentId, status, conversationId, mdStatus } = body;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';

    if (!conversationId) return NextResponse.redirect(`${frontendUrl}/sepet?error=SiparisIDBulunamadi`, 303);

    const order = await Order.findById(conversationId);
    if (!order) return NextResponse.redirect(`${frontendUrl}/sepet?error=SiparisBulunamadi`, 303);

    if (status === 'success' && (mdStatus === '1' || mdStatus === 1)) {
      const authResult = await auth3D(paymentId, conversationId);
      if (authResult.status !== 'success') {
        await Order.findByIdAndUpdate(conversationId, {
          paymentStatus: 'failed',
          paymentId,
          paymentDetails: authResult,
          paymentError: authResult.errorMessage || 'Ödeme doğrulanamadı',
        });
        return NextResponse.redirect(`${frontendUrl}/odeme?error=DogrulamaHatasi`, 303);
      }

      if (order.paymentStatus !== 'paid') {
        await Order.findByIdAndUpdate(conversationId, {
          paymentStatus: 'paid',
          orderStatus: 'processing',
          paymentId,
          paymentDetails: authResult,
        });

        for (const item of order.items) {
          const product = await Product.findById(item.product);
          if (!product) continue;

          if (item.color && item.size && product.colorSizeStock) {
            const colorStock = product.colorSizeStock instanceof Map ? product.colorSizeStock.get(item.color) : product.colorSizeStock[item.color];
            if (colorStock) {
              const currentStock = colorStock instanceof Map ? colorStock.get(item.size) : colorStock[item.size];
              if (colorStock instanceof Map) colorStock.set(item.size, Math.max(0, (currentStock || 0) - item.quantity));
              else colorStock[item.size] = Math.max(0, (currentStock || 0) - item.quantity);
              await product.save();
            }
          } else {
            await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
          }
        }
      }
      return NextResponse.redirect(`${frontendUrl}/siparisler?success=true&orderId=${conversationId}`, 303);
    } else {
      await Order.findByIdAndUpdate(conversationId, {
        paymentStatus: 'failed',
        paymentId,
        paymentDetails: body,
        paymentError: body.errorMessage || '3D Onayı alınamadı',
      });
      return NextResponse.redirect(`${frontendUrl}/odeme?error=OdemeBasarisiz`, 303);
    }
  } catch (error) {
    console.error('İyzico callback hatası:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    return NextResponse.redirect(`${frontendUrl}/sepet?error=SistemselHata`, 303);
  }
}

