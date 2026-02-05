import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import User from '@/models/User'; // User model'ini import et - populate için gerekli
import Product from '@/models/Product'; // Product model'ini import et - populate için gerekli
import { getCurrentUser } from '@/lib/auth';
import { getCorsHeaders } from '@/lib/cors';

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

    const { id } = await params;
    const order = await Order.findById(id)
      .populate('user', 'name email')
      .populate('items.product', 'name images')
      .lean();

    if (!order) {
      return NextResponse.json(
        { error: 'Sipariş bulunamadı' },
        { status: 404 }
      );
    }

    if (user.role !== 'admin' && (order.user as any)._id.toString() !== user.userId) {
      return NextResponse.json(
        { error: 'Yetkisiz erişim' },
        { 
          status: 403,
          headers: getCorsHeaders(request),
        }
      );
    }

    return NextResponse.json(order, {
      headers: getCorsHeaders(request),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Sipariş getirilemedi' },
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

    const { id } = await params;
    const body = await request.json();
    
    // Siparişi bul
    const existingOrder = await Order.findById(id);
    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Sipariş bulunamadı' },
        { 
          status: 404,
          headers: getCorsHeaders(request),
        }
      );
    }

    // Müşteri sadece kendi siparişini güncelleyebilir
    if (user.role !== 'admin' && existingOrder.user.toString() !== user.userId) {
      return NextResponse.json(
        { error: 'Yetkisiz erişim' },
        { 
          status: 403,
          headers: getCorsHeaders(request),
        }
      );
    }

    // Müşteri iptal işlemi kontrolü
    if (user.role !== 'admin' && body.orderStatus === 'cancelled') {
      // Sadece pending veya processing durumundaki siparişler iptal edilebilir
      if (existingOrder.orderStatus !== 'pending' && existingOrder.orderStatus !== 'processing') {
        return NextResponse.json(
          { error: 'Bu sipariş sadece beklemede veya işleniyor durumundayken iptal edilebilir' },
          { 
            status: 400,
            headers: getCorsHeaders(request),
          }
        );
      }
    }

    // Admin tüm durumları güncelleyebilir, müşteri sadece iptal edebilir
    const updateData: any = {};
    if (body.orderStatus) {
      if (user.role === 'admin') {
        updateData.orderStatus = body.orderStatus;
      } else if (body.orderStatus === 'cancelled') {
        updateData.orderStatus = 'cancelled';
      } else {
        return NextResponse.json(
          { error: 'Sadece admin sipariş durumunu güncelleyebilir' },
          { 
            status: 403,
            headers: getCorsHeaders(request),
          }
        );
      }
    }
    if (body.paymentStatus && user.role === 'admin') {
      updateData.paymentStatus = body.paymentStatus;
    }
    
    // Siparişi güncelle
    const order = await Order.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('user', 'name email')
      .populate('items.product', 'name images')
      .lean();

    if (!order) {
      return NextResponse.json(
        { error: 'Sipariş bulunamadı' },
        { 
          status: 404,
          headers: getCorsHeaders(request),
        }
      );
    }

    // Eğer sipariş iptal edildiyse, stokları geri ekle
    if (updateData.orderStatus === 'cancelled' && existingOrder.orderStatus !== 'cancelled') {
      const items = (order as any).items || existingOrder.items;
      
      for (const item of items) {
        const productId = item.product?._id || item.product;
        if (!productId) continue;

        const product = await Product.findById(productId);
        if (!product) continue;

        // Renk ve bedene göre stok geri ekleme
        if (item.color && item.size && product.colorSizeStock) {
          if (product.colorSizeStock instanceof Map) {
            const colorStock = product.colorSizeStock.get(item.color);
            if (colorStock) {
              const currentStock = colorStock.get(item.size) || 0;
              colorStock.set(item.size, currentStock + item.quantity);
              product.colorSizeStock.set(item.color, colorStock);
              await product.save();
            }
          } else {
            // Object formatında ise
            const colorStock = (product.colorSizeStock as any)[item.color];
            if (colorStock) {
              const currentStock = colorStock[item.size] || 0;
              colorStock[item.size] = currentStock + item.quantity;
              (product.colorSizeStock as any)[item.color] = colorStock;
              await product.save();
            }
          }
        } else {
          // Genel stok geri ekle
          await Product.findByIdAndUpdate(productId, {
            $inc: { stock: item.quantity },
          });
        }
      }
    }

    return NextResponse.json(order, {
      headers: getCorsHeaders(request),
    });
  } catch (error: any) {
    console.error('Sipariş güncelleme hatası:', error);
    return NextResponse.json(
      { error: error.message || 'Sipariş güncellenemedi' },
      { 
        status: 500,
        headers: getCorsHeaders(request),
      }
    );
  }
}

