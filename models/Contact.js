import mongoose from 'mongoose';

const ContactSchema = new mongoose.Schema(
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
      default: 50,
    },
    freeShippingThreshold: {
      type: Number,
      default: 2500,
    },
    featuredCategories: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Category',
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const Contact = mongoose.models.Contact || mongoose.model('Contact', ContactSchema);

export default Contact;

