import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
// Model'leri import et - populate için gerekli
// Model'ler mongodb.ts'de de import ediliyor, burada da import ediyoruz populate için
import Order from '@/models/Order';
import Product from '@/models/Product';
import User from '@/models/User';
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

    const query: any = {};
    if (user.role !== 'admin') {
      query.user = user.userId;
    }

    const orders = await Order.find(query)
      .populate('user', 'name email')
      .populate('items.product', 'name images')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(orders, {
      headers: getCorsHeaders(request),
    });
  } catch (error: any) {
    console.error('Orders GET hatası:', error);
    return NextResponse.json(
      { error: error.message || 'Siparişler getirilemedi' },
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
    const { items, shippingAddress, contactInfo, paymentMethod, totalPrice, shippingCost } = body;

    // Toplam fiyat kontrolü - frontend'den gelen totalPrice kullanılabilir ama doğrulama yapalım
    let calculatedTotal = 0;
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
      
      // Renk ve bedene göre stok kontrolü
      if (item.color && item.size && product.colorSizeStock) {
        // colorSizeStock Map veya object olabilir
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
    }

    // Frontend'den gelen totalPrice ile karşılaştır (kargo dahil)
    const finalTotal = (totalPrice || calculatedTotal) + (shippingCost || 0);

    const order = await Order.create({
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
      paymentMethod,
      totalPrice: finalTotal,
      shippingCost: shippingCost || 0,
      orderStatus: 'pending', // Açıkça belirt
      paymentStatus: 'pending', // Açıkça belirt
    });

    // Stok güncelleme - renk ve bedene göre
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) continue;

      if (item.color && item.size && product.colorSizeStock) {
        // Renk ve bedene göre stok azalt
        if (product.colorSizeStock instanceof Map) {
          const colorStock = product.colorSizeStock.get(item.color);
          if (colorStock) {
            const currentStock = colorStock.get(item.size) || 0;
            colorStock.set(item.size, Math.max(0, currentStock - item.quantity));
            product.colorSizeStock.set(item.color, colorStock);
            await product.save();
          }
        } else {
          // Object formatında ise
          const colorStock = (product.colorSizeStock as any)[item.color];
          if (colorStock) {
            const currentStock = colorStock[item.size] || 0;
            colorStock[item.size] = Math.max(0, currentStock - item.quantity);
            (product.colorSizeStock as any)[item.color] = colorStock;
            await product.save();
          }
        }
      } else {
        // Genel stok azalt
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: -item.quantity },
        });
      }
    }

    // Siparişi populate ederek döndür
    const populatedOrder = await Order.findById(order._id)
      .populate('user', 'name email')
      .populate('items.product', 'name images')
      .lean();

    return NextResponse.json(populatedOrder, { 
      status: 201,
      headers: getCorsHeaders(request),
    });
  } catch (error: any) {
    console.error('Sipariş oluşturma hatası:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Sipariş oluşturulamadı',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { 
        status: 500,
        headers: getCorsHeaders(request),
      }
    );
  }
}

