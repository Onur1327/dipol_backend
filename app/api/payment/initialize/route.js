import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb.js';
import { getCurrentUser } from '../../../../lib/auth.js';
import { getCorsHeaders } from '../../../../lib/cors.js';
import { initializePayment } from '../../../../lib/iyzipay.js';
import { validateTCIdentityNumber } from '../../../../lib/security.js';
import Order from '../../../../models/Order.js';
import Product from '../../../../models/Product.js';
import User from '../../../../models/User.js';

export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeaders(request),
  });
}

export async function POST(request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401, headers: getCorsHeaders(request) });
    }

    await connectDB();
    const body = await request.json();
    const { items, shippingAddress, contactInfo, paymentCard, totalPrice, shippingCost, identityNumber } = body;

    if (!identityNumber) {
      return NextResponse.json({ error: 'TC Kimlik numarası gereklidir' }, { status: 400, headers: getCorsHeaders(request) });
    }

    const tcValidation = validateTCIdentityNumber(identityNumber);
    if (!tcValidation.valid) {
      return NextResponse.json({ error: tcValidation.message || 'Geçersiz TC Kimlik numarası' }, { status: 400, headers: getCorsHeaders(request) });
    }

    let calculatedTotal = 0;
    const basketItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return NextResponse.json({ error: `Ürün bulunamadı: ${item.product}` }, { status: 404, headers: getCorsHeaders(request) });
      }

      if (item.color && item.size && product.colorSizeStock) {
        const colorStock = product.colorSizeStock instanceof Map ? product.colorSizeStock.get(item.color) : product.colorSizeStock[item.color];
        if (colorStock) {
          const sizeStock = colorStock instanceof Map ? colorStock.get(item.size) : colorStock[item.size];
          if (sizeStock === undefined || sizeStock < item.quantity) {
            return NextResponse.json({ error: `${product.name} (${item.color}, ${item.size}) için yeterli stok yok` }, { status: 400, headers: getCorsHeaders(request) });
          }
        }
      } else if (product.stock < item.quantity) {
        return NextResponse.json({ error: `${product.name} için yeterli stok yok` }, { status: 400, headers: getCorsHeaders(request) });
      }

      const effectivePrice = (product.comparePrice && product.comparePrice > 0)
        ? Math.min(product.price, product.comparePrice)
        : product.price;

      calculatedTotal += effectivePrice * item.quantity;
      basketItems.push({
        id: `${product._id.toString()}_${basketItems.length}`,
        name: product.name + (item.color ? ` (${item.color}, ${item.size})` : ''),
        category1: 'Giyim',
        itemType: 'PHYSICAL',
        price: Number(effectivePrice.toFixed(2)),
      });
    }

    if (shippingCost && shippingCost > 0) {
      basketItems.push({
        id: 'SHIPPING_FEE',
        name: 'Kargo Ücreti',
        category1: 'Lojistik',
        itemType: 'VIRTUAL',
        price: Number(shippingCost.toFixed(2)),
      });
    }

    const finalTotal = basketItems.reduce((sum, item) => sum + parseFloat(item.price), 0);
    await User.findByIdAndUpdate(user.userId, { identityNumber }, { upsert: false });

    const tempOrder = await Order.create({
      user: user.userId,
      items: items.map(item => ({
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

    const rawPhone = contactInfo.phone.replace(/\D/g, '');
    let gsmNumber = rawPhone;
    if (rawPhone.length === 11 && rawPhone.startsWith('0')) gsmNumber = `+90${rawPhone.substring(1)}`;
    else if (rawPhone.length === 10 && !rawPhone.startsWith('0')) gsmNumber = `+90${rawPhone}`;
    else if (!rawPhone.startsWith('+')) gsmNumber = `+${rawPhone}`;

    const nameParts = shippingAddress.name.trim().split(/\s+/);
    const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : 'Butik';
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';

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
        identityNumber,
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
      basketItems: basketItems.map(item => ({ ...item, price: item.price })),
      callbackUrl: `${process.env.BACKEND_URL || 'http://localhost:3002'}/api/payment/callback`,
    };

    const paymentResult = await initializePayment(paymentData);
    if (paymentResult.status === 'success') {
      if (paymentResult.threeDSHtmlContent) {
        return NextResponse.json({ success: true, threeDSHtmlContent: paymentResult.threeDSHtmlContent }, { headers: getCorsHeaders(request) });
      }
      return NextResponse.json({ error: 'Ödeme onay sayfası oluşturulamadı', details: paymentResult }, { status: 400, headers: getCorsHeaders(request) });
    } else {
      await Order.findByIdAndUpdate(tempOrder._id, { paymentStatus: 'failed' });
      return NextResponse.json({ error: paymentResult.errorMessage || 'Ödeme işlemi başarısız', details: paymentResult }, { status: 400, headers: getCorsHeaders(request) });
    }
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Ödeme işlemi başlatılamadı' }, { status: 500, headers: getCorsHeaders(request) });
  }
}

