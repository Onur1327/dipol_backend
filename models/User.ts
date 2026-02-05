import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: 'user' | 'admin';
  phone?: string;
  identityNumber?: string; // TC Kimlik Numarası
  address?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  resetToken?: string;
  resetTokenExpiry?: Date;
  emailVerified?: boolean;
  emailVerificationToken?: string;
  emailVerificationTokenExpiry?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'İsim gereklidir'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'E-posta gereklidir'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Şifre gereklidir'],
      minlength: 6,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    phone: {
      type: String,
      trim: true,
    },
    identityNumber: {
      type: String,
      trim: true,
      select: false, // Güvenlik için varsayılan olarak döndürülmez
    },
    address: {
      street: String,
      city: String,
      postalCode: String,
      country: String,
    },
    resetToken: {
      type: String,
      select: false, // Varsayılan olarak döndürülmez
    },
    resetTokenExpiry: {
      type: Date,
      select: false,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      select: false,
    },
    emailVerificationTokenExpiry: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;

