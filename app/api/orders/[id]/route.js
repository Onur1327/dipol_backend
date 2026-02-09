import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb.js';
import Order from '../../../../models/Order.js';
import User from '../../../../models/User.js';
import Product from '../../../../models/Product.js';
import { getCurrentUser } from '../../../../lib/auth.js';
import { getCorsHeaders } from '../../../../lib/cors.js';

export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeaders(request),
  });
}

export async function GET(request, { params }) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401, headers: getCorsHeaders(request) });

    await connectDB();
    const { id } = await params;
    const order = await Order.findById(id).populate('user', 'name email').populate('items.product', 'name images').lean();

    if (!order) return NextResponse.json({ error: 'Sipariş bulunamadı' }, { status: 404 });
    if (user.role !== 'admin' && order.user._id.toString() !== user.userId) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403, headers: getCorsHeaders(request) });
    }

    return NextResponse.json(order, { headers: getCorsHeaders(request) });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Sipariş getirilemedi' }, { status: 500, headers: getCorsHeaders(request) });
  }
}

export async function PUT(request, { params }) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401, headers: getCorsHeaders(request) });

    await connectDB();
    const { id } = await params;
    const body = await request.json();

    const existingOrder = await Order.findById(id);
    if (!existingOrder) return NextResponse.json({ error: 'Sipariş bulunamadı' }, { status: 404, headers: getCorsHeaders(request) });

    if (user.role !== 'admin' && existingOrder.user.toString() !== user.userId) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403, headers: getCorsHeaders(request) });
    }

    if (user.role !== 'admin' && body.orderStatus === 'cancelled') {
      if (existingOrder.orderStatus !== 'pending' && existingOrder.orderStatus !== 'processing') {
        return NextResponse.json({ error: 'Bu sipariş sadece beklemede veya işleniyor durumundayken iptal edilebilir' }, { status: 400, headers: getCorsHeaders(request) });
      }
    }

    const updateData = {};
    if (body.orderStatus) {
      if (user.role === 'admin' || body.orderStatus === 'cancelled') {
        updateData.orderStatus = body.orderStatus;
      } else {
        return NextResponse.json({ error: 'Sadece admin sipariş durumunu güncelleyebilir' }, { status: 403, headers: getCorsHeaders(request) });
      }
    }
    if (body.paymentStatus && user.role === 'admin') updateData.paymentStatus = body.paymentStatus;

    const order = await Order.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).populate('user', 'name email').populate('items.product', 'name images').lean();
    if (!order) return NextResponse.json({ error: 'Sipariş bulunamadı' }, { status: 404, headers: getCorsHeaders(request) });

    if (updateData.orderStatus === 'cancelled' && existingOrder.orderStatus !== 'cancelled') {
      const items = order.items || existingOrder.items;
      for (const item of items) {
        const productId = item.product?._id || item.product;
        if (!productId) continue;
        const product = await Product.findById(productId);
        if (!product) continue;

        if (item.color && item.size && product.colorSizeStock) {
          if (product.colorSizeStock instanceof Map) {
            const colorStock = product.colorSizeStock.get(item.color);
            if (colorStock) {
              colorStock.set(item.size, (colorStock.get(item.size) || 0) + item.quantity);
              product.colorSizeStock.set(item.color, colorStock);
              await product.save();
            }
          } else {
            const colorStock = product.colorSizeStock[item.color];
            if (colorStock) {
              colorStock[item.size] = (colorStock[item.size] || 0) + item.quantity;
              product.colorSizeStock[item.color] = colorStock;
              await product.save();
            }
          }
        } else {
          await Product.findByIdAndUpdate(productId, { $inc: { stock: item.quantity } });
        }
      }
    }

    return NextResponse.json(order, { headers: getCorsHeaders(request) });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Sipariş güncellenemedi' }, { status: 500, headers: getCorsHeaders(request) });
  }
}

