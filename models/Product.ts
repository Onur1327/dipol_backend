import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  slug: string;
  description: string;
  price: number;
  comparePrice?: number;
  images: string[];
  colorImages?: { [color: string]: string[] }; // Renk bazlı görseller
  category: mongoose.Types.ObjectId;
  sizes: string[];
  colors: string[];
  stock: number;
  colorSizeStock?: Map<string, Map<string, number>> | { [color: string]: { [size: string]: number } }; // Renk/beden bazlı stok
  featured: boolean;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Ürün adı gereklidir'],
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: [true, 'Ürün açıklaması gereklidir'],
    },
    price: {
      type: Number,
      required: [true, 'Fiyat gereklidir'],
      min: 0,
    },
    comparePrice: {
      type: Number,
      min: 0,
    },
    images: {
      type: [String],
      default: [],
    },
    colorImages: {
      type: Map,
      of: [String],
      default: {},
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    sizes: {
      type: [String],
      default: [],
    },
    colors: {
      type: [String],
      default: [],
    },
    stock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    // Renk ve beden kombinasyonuna göre stok
    colorSizeStock: {
      type: Map,
      of: {
        type: Map,
        of: Number,
      },
      default: {},
    },
    featured: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

const Product: Model<IProduct> = mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);

export default Product;

