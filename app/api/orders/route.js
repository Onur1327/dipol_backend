import { NextResponse } from 'next/server';
import connectDB from '../../../lib/mongodb.js';
import Order from '../../../models/Order.js';
import Product from '../../../models/Product.js';
import User from '../../../models/User.js';
import { getCurrentUser } from '../../../lib/auth.js';
import { getCorsHeaders } from '../../../lib/cors.js';

export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeaders(request),
  });
}

export async function GET(request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401, headers: getCorsHeaders(request) });
    }

    await connectDB();
    const query = {};
    if (user.role !== 'admin') query.user = user.userId;

    const orders = await Order.find(query)
      .populate('user', 'name email')
      .populate('items.product', 'name images')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(orders, { headers: getCorsHeaders(request) });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Siparişler getirilemedi' }, { status: 500, headers: getCorsHeaders(request) });
  }
}

export async function POST(request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401, headers: getCorsHeaders(request) });
    }

    await connectDB();
    const body = await request.json();
    const { items, shippingAddress, contactInfo, paymentMethod, totalPrice, shippingCost } = body;

    let calculatedTotal = 0;
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) return NextResponse.json({ error: `Ürün bulunamadı: ${item.product}` }, { status: 404, headers: getCorsHeaders(request) });

      if (item.color && item.size && product.colorSizeStock) {
        const colorStock = product.colorSizeStock instanceof Map
          ? product.colorSizeStock.get(item.color)
          : product.colorSizeStock[item.color];

        if (colorStock) {
          const sizeStock = colorStock instanceof Map ? colorStock.get(item.size) : colorStock[item.size];
          if (sizeStock === undefined || sizeStock < item.quantity) {
            return NextResponse.json({ error: `${product.name} (${item.color}, ${item.size}) için yeterli stok yok` }, { status: 400, headers: getCorsHeaders(request) });
          }
        }
      } else if (product.stock < item.quantity) {
        return NextResponse.json({ error: `${product.name} için yeterli stok yok` }, { status: 400, headers: getCorsHeaders(request) });
      }
      calculatedTotal += product.price * item.quantity;
    }

    const finalTotal = (totalPrice || calculatedTotal) + (shippingCost || 0);

    const order = await Order.create({
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
      paymentMethod,
      totalPrice: finalTotal,
      shippingCost: shippingCost || 0,
      orderStatus: 'pending',
      paymentStatus: 'pending',
    });

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) continue;

      if (item.color && item.size && product.colorSizeStock) {
        if (product.colorSizeStock instanceof Map) {
          const colorStock = product.colorSizeStock.get(item.color);
          if (colorStock) {
            const currentStock = colorStock.get(item.size) || 0;
            colorStock.set(item.size, Math.max(0, currentStock - item.quantity));
            product.colorSizeStock.set(item.color, colorStock);
            await product.save();
          }
        } else {
          const colorStock = product.colorSizeStock[item.color];
          if (colorStock) {
            const currentStock = colorStock[item.size] || 0;
            colorStock[item.size] = Math.max(0, currentStock - item.quantity);
            product.colorSizeStock[item.color] = colorStock;
            await product.save();
          }
        }
      } else {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
      }
    }

    const populatedOrder = await Order.findById(order._id)
      .populate('user', 'name email')
      .populate('items.product', 'name images')
      .lean();

    return NextResponse.json(populatedOrder, { status: 201, headers: getCorsHeaders(request) });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Sipariş oluşturulamadı' }, { status: 500, headers: getCorsHeaders(request) });
  }
}

