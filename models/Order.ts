import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IOrderItem {
  product: mongoose.Types.ObjectId;
  name: string;
  image: string;
  price: number;
  quantity: number;
  size?: string;
  color?: string;
}

export interface IOrder extends Document {
  user: mongoose.Types.ObjectId;
  items: IOrderItem[];
  shippingAddress: {
    name: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
  };
  contactInfo?: {
    email: string;
    phone: string;
  };
  paymentMethod: string;
  paymentStatus: 'pending' | 'paid' | 'failed';
  paymentId?: string; // İyzico payment ID
  paymentDetails?: any; // İyzico'dan gelen detaylar
  paymentError?: string; // Ödeme hatası mesajı
  orderStatus: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  totalPrice: number;
  shippingCost?: number;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema: Schema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: [
      {
        product: {
          type: Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        name: String,
        image: String,
        price: Number,
        quantity: Number,
        size: String,
        color: String,
      },
    ],
    shippingAddress: {
      name: String,
      address: String,
      city: String,
      postalCode: String,
      country: String,
    },
    contactInfo: {
      email: String,
      phone: String,
    },
    paymentMethod: {
      type: String,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending',
    },
    paymentId: {
      type: String,
    },
    paymentDetails: {
      type: Schema.Types.Mixed,
    },
    paymentError: {
      type: String,
    },
    orderStatus: {
      type: String,
      enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    shippingCost: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Order: Model<IOrder> = mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);

export default Order;

