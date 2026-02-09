import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

// Model'leri register et
import '../models/User.js';
import '../models/Product.js';
import '../models/Order.js';
import '../models/Category.js';
import '../models/Contact.js';

const envLocalPath = resolve(process.cwd(), '.env.local');
if (existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
}

const MONGODB_URI = process.env.database_url || process.env.DATABASE_URL || process.env.MONGODB_URI || '';

if (!MONGODB_URI) {
  throw new Error('Please define the database_url environment variable inside .env.local');
}

let cached = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      const dbName = mongoose.connection.db?.databaseName || 'unknown';
      console.log('✅ MongoDB bağlantısı başarılı. Database:', dbName);
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error('❌ MongoDB bağlantı hatası:', e);
    throw e;
  }

  return cached.conn;
}

export default connectDB;

