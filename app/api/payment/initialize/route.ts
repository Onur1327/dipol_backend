import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getCurrentUser } from '@/lib/auth';
import { getCorsHeaders } from '@/lib/cors';
import { initializePayment } from '@/lib/iyzipay';
import { validateTCIdentityNumber } from '@/lib/security';
import Order from '@/models/Order';
import Product from '@/models/Product';
import User from '@/models/User';
import crypto from 'crypto';

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeaders(request),
  });
}

export async function POST(request: NextRequest) {
  console.log('[Payment Init] Request received');
  try {
    const user = await getCurrentUser(request);
    if (!user) {
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
    console.log('[DEBUG] Request Body Keys:', Object.keys(body));

    const {
      items,
      shippingAddress,
      contactInfo,
      paymentCard,
      totalPrice,
      shippingCost,
      identityNumber // TC Kimlik Numarası
    } = body;

    // TC Kimlik numarası kontrolü
    if (!identityNumber) {
      console.log('[DEBUG] 400 - Identity number missing');
      return NextResponse.json(
        { error: 'TC Kimlik numarası gereklidir' },
        {
          status: 400,
          headers: getCorsHeaders(request),
        }
      );
    }

    const tcValidation = validateTCIdentityNumber(identityNumber);
    if (!tcValidation.valid) {
      console.log('[DEBUG] 400 - TC Validation Error:', tcValidation.message);
      return NextResponse.json(
        { error: tcValidation.message || 'Geçersiz TC Kimlik numarası' },
        {
          status: 400,
          headers: getCorsHeaders(request),
        }
      );
    }

    // Stok kontrolü ve toplam fiyat hesaplama
    let calculatedTotal = 0;
    const basketItems: any[] = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return NextResponse.json(
          { error: `Ürün bulunamadı: ${item.product}` },
          {
            status: 404,
            headers: getCorsHeaders(request),
          }
        );
      }

      // Stok kontrolü
      if (item.color && item.size && product.colorSizeStock) {
        const colorStock = product.colorSizeStock instanceof Map
          ? product.colorSizeStock.get(item.color)
          : (product.colorSizeStock as any)[item.color];

        if (colorStock) {
          const sizeStock = colorStock instanceof Map
            ? colorStock.get(item.size)
            : (colorStock as any)[item.size];

          if (sizeStock === undefined || sizeStock < item.quantity) {
            return NextResponse.json(
              { error: `${product.name} (${item.color}, ${item.size}) için yeterli stok yok` },
              {
                status: 400,
                headers: getCorsHeaders(request),
              }
            );
          }
        }
      } else if (product.stock < item.quantity) {
        return NextResponse.json(
          { error: `${product.name} için yeterli stok yok` },
          {
            status: 400,
            headers: getCorsHeaders(request),
          }
        );
      }

      calculatedTotal += product.price * item.quantity;

      basketItems.push({
        id: `${product._id.toString()}_${basketItems.length}`,
        name: product.name + (item.color ? ` (${item.color}, ${item.size})` : ''),
        category1: 'Giyim',
        itemType: 'PHYSICAL',
        price: Number((product.price * item.quantity).toFixed(2)),
      });
    }

    // Kargo ücretini sepet öğesi olarak ekle
    if (shippingCost && shippingCost > 0) {
      basketItems.push({
        id: 'SHIPPING_FEE',
        name: 'Kargo Ücreti',
        category1: 'Lojistik',
        itemType: 'VIRTUAL',
        price: Number(shippingCost.toFixed(2)),
      });
    }

    // Toplam fiyat: Iyzico 'price' tüm sepet kalemlerinin toplamıdır.
    const calculatedPrice = basketItems.reduce((sum, item) => sum + parseFloat(item.price), 0);
    const finalTotal = calculatedPrice; // paidPrice da buna eşit olacak (indirim yoksa)

    // Kullanıcının TC Kimlik numarasını güncelle (eğer yoksa veya farklıysa)
    await User.findByIdAndUpdate(user.userId, {
      identityNumber: identityNumber,
    }, { upsert: false });

    // Geçici sipariş oluştur (pending durumunda)
    const tempOrder = await Order.create({
      user: user.userId,
      items: items.map((item: any) => ({
        product: item.product,
        name: item.name,
        image: item.image || '',
        price: item.price,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
      })),
      shippingAddress,
      contactInfo,
      paymentMethod: 'credit-card',
      totalPrice: finalTotal,
      shippingCost: shippingCost || 0,
      orderStatus: 'pending',
      paymentStatus: 'pending',
    });

    // Telefon numarası formatı (+90)
    const rawPhone = contactInfo.phone.replace(/\D/g, '');
    let gsmNumber = rawPhone;
    if (rawPhone.length === 11 && rawPhone.startsWith('0')) {
      gsmNumber = `+90${rawPhone.substring(1)}`;
    } else if (rawPhone.length === 10 && !rawPhone.startsWith('0')) {
      gsmNumber = `+90${rawPhone}`;
    } else if (!rawPhone.startsWith('+')) {
      gsmNumber = `+${rawPhone}`;
    }

    // Soyadı kontrolü (Iyzico soyadı bekler)
    const nameParts = shippingAddress.name.trim().split(/\s+/);
    const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : 'Butik'; // Soyadı yoksa fallback

    // IP adresi al
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';

    // İyzico ödeme başlatma (SDK için string fiyatlar daha güvenlidir)
    const paymentData = {
      locale: 'tr',
      conversationId: tempOrder._id.toString(),
      price: finalTotal.toFixed(2),
      paidPrice: finalTotal.toFixed(2),
      currency: 'TRY',
      installment: '1',
      basketId: tempOrder._id.toString(),
      paymentChannel: 'WEB',
      ip: clientIp,
      paymentCard: {
        cardHolderName: paymentCard.cardHolderName,
        cardNumber: paymentCard.cardNumber.replace(/\s/g, ''),
        expireMonth: paymentCard.expireMonth,
        expireYear: paymentCard.expireYear.length === 2 ? `20${paymentCard.expireYear}` : paymentCard.expireYear,
        cvc: paymentCard.cvc,
        registerCard: 0,
      },
      buyer: {
        id: user.userId,
        name: firstName,
        surname: lastName,
        gsmNumber: gsmNumber,
        email: contactInfo.email,
        identityNumber: identityNumber, // TC Kimlik No
        registrationAddress: shippingAddress.address || 'Istanbul',
        city: shippingAddress.city || 'Istanbul',
        country: shippingAddress.country || 'Türkiye',
        zipCode: shippingAddress.postalCode || '34000',
        ip: clientIp,
      },
      shippingAddress: {
        contactName: shippingAddress.name,
        city: shippingAddress.city || 'Istanbul',
        country: shippingAddress.country || 'Türkiye',
        address: shippingAddress.address || 'Istanbul',
        zipCode: shippingAddress.postalCode || '34000',
      },
      billingAddress: {
        contactName: shippingAddress.name,
        city: shippingAddress.city || 'Istanbul',
        country: shippingAddress.country || 'Türkiye',
        address: shippingAddress.address || 'Istanbul',
        zipCode: shippingAddress.postalCode || '34000',
      },
      basketItems: basketItems.map(item => ({
        ...item,
        price: Number(item.price).toFixed(2) // SDK için string
      })),
      callbackUrl: `${process.env.BACKEND_URL || 'http://localhost:3002'}/api/payment/callback`,
    };

    console.log('Iyzico Payload (Ready):', JSON.stringify(paymentData, null, 2));

    const paymentResult: any = await initializePayment(paymentData as any);
    console.log('Iyzico raw result:', JSON.stringify(paymentResult, null, 2));

    if (paymentResult.status === 'success') {
      console.log('[DEBUG] 200 - Iyzico success');
      // 3D Secure durumunda html content döner - Kullanıcıyı banka sayfasına yönlendirir
      if (paymentResult.threeDSHtmlContent) {
        return NextResponse.json({
          success: true,
          threeDSHtmlContent: paymentResult.threeDSHtmlContent,
        }, {
          headers: getCorsHeaders(request),
        });
      }

      // 3D Secure olmayan veya HTML dönmeyen durum (hata olarak kabul edilir)
      console.log('[DEBUG] 400 - Iyzico success but no html content');
      return NextResponse.json(
        {
          error: 'Ödeme onay sayfası oluşturulamadı',
          details: paymentResult,
        },
        {
          status: 400,
          headers: getCorsHeaders(request),
        }
      );
    } else {
      console.log('[DEBUG] 400 - Iyzico failure result:', paymentResult.errorMessage);
      // Ödeme başarısız - siparişi iptal et
      await Order.findByIdAndUpdate(tempOrder._id, {
        paymentStatus: 'failed',
      });

      return NextResponse.json(
        {
          error: paymentResult.errorMessage || 'Ödeme işlemi başarısız',
          details: paymentResult,
        },
        {
          status: 400,
          headers: getCorsHeaders(request),
        }
      );
    }
  } catch (error: any) {
    console.error('Ödeme başlatma hatası (Global Catch):', error);
    let headers: any = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true'
    };

    try {
      headers = getCorsHeaders(request);
    } catch (corsError) {
      console.error('CORS header generation failed:', corsError);
    }

    return NextResponse.json(
      {
        error: error.message || 'Ödeme işlemi başlatılamadı',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      {
        status: 500,
        headers,
      }
    );
  }
}

