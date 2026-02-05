import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IContact extends Document {
  companyName: string;
  email: string;
  phone: string;
  whatsappNumber?: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
  };
  businessHours?: {
    weekdays?: string;
    weekend?: string;
  };
  shippingCost?: number; // Kargo ücreti
  freeShippingThreshold?: number; // Ücretsiz kargo eşiği (TL)
  featuredCategories?: string[]; // Öne çıkan kategoriler (ObjectId array)
  createdAt: Date;
  updatedAt: Date;
}

const ContactSchema: Schema = new Schema(
  {
    companyName: {
      type: String,
      required: [true, 'Şirket adı gereklidir'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'E-posta gereklidir'],
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: [true, 'Telefon gereklidir'],
      trim: true,
    },
    whatsappNumber: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      required: [true, 'Adres gereklidir'],
      trim: true,
    },
    city: {
      type: String,
      required: [true, 'Şehir gereklidir'],
      trim: true,
    },
    postalCode: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      required: [true, 'Ülke gereklidir'],
      trim: true,
      default: 'Türkiye',
    },
    socialMedia: {
      facebook: String,
      instagram: String,
      twitter: String,
      linkedin: String,
    },
    businessHours: {
      weekdays: String,
      weekend: String,
    },
    shippingCost: {
      type: Number,
      default: 50, // Varsayılan kargo ücreti
    },
    freeShippingThreshold: {
      type: Number,
      default: 2500, // Varsayılan ücretsiz kargo eşiği
    },
    featuredCategories: {
      type: [Schema.Types.ObjectId],
      ref: 'Category',
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const Contact: Model<IContact> = mongoose.models.Contact || mongoose.model<IContact>('Contact', ContactSchema);

export default Contact;

