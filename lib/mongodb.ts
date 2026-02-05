import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

// Model'leri import et - bu, model'lerin register edilmesini sağlar
// Bu import'lar, connectDB çağrılmadan önce yapılmalı
import '@/models/User';
import '@/models/Product';
import '@/models/Order';
import '@/models/Category';
import '@/models/Contact';

// .env.local dosyasını yükle (varsa)
const envLocalPath = resolve(process.cwd(), '.env.local');
if (existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
}

let MONGODB_URI = process.env.database_url || process.env.DATABASE_URL || process.env.MONGODB_URI || '';

if (!MONGODB_URI) {
  throw new Error('Please define the database_url environment variable inside .env.local');
}

// Connection string'den database adını tamamen kaldır - dbName option ile kullanacağız
// Bu, connection string'deki database adından bağımsız olarak her zaman 'dipol-butik' kullanmamızı sağlar
// MongoDB connection string formatı: mongodb+srv://user:pass@cluster.mongodb.net/database-name?options
// veya: mongodb://user:pass@cluster.mongodb.net:27017/database-name?options

// Önce mongodb:// veya mongodb+srv:// kısmını bul
const protocolMatch = MONGODB_URI.match(/^(mongodb\+?srv?:\/\/)/);
if (protocolMatch) {
  const protocol = protocolMatch[1];
  const afterProtocol = MONGODB_URI.substring(protocol.length);
  
  // @ işaretinden sonraki kısmı bul (host ve path)
  const atIndex = afterProtocol.indexOf('@');
  if (atIndex > 0) {
    const credentials = afterProtocol.substring(0, atIndex);
    const hostAndPath = afterProtocol.substring(atIndex + 1);
    
    // İlk / karakterinden önceki kısım host, sonrası path (database adı + query string)
    const slashIndex = hostAndPath.indexOf('/');
    if (slashIndex > 0) {
      const host = hostAndPath.substring(0, slashIndex);
      const pathAndQuery = hostAndPath.substring(slashIndex + 1);
      
      // Query string'i bul (? karakterinden sonrası)
      const queryIndex = pathAndQuery.indexOf('?');
      let queryString = '';
      if (queryIndex > 0) {
        queryString = '?' + pathAndQuery.substring(queryIndex + 1);
      }
      
      // Database adını kaldır, sadece host + query string kullan
      // dbName option ile 'dipol-butik' kullanacağız
      MONGODB_URI = `${protocol}${credentials}@${host}${queryString}`;
      console.log('🔧 Connection string\'den database adı kaldırıldı. dbName option ile "dipol-butik" kullanılacak');
    } else {
      // Zaten database adı yok, sadece query string ekle
      const queryIndex = hostAndPath.indexOf('?');
      if (queryIndex < 0) {
        // Query string yoksa ekle
        MONGODB_URI = `${protocol}${credentials}@${hostAndPath}`;
      }
      console.log('🔧 Connection string zaten database adı içermiyor');
    }
  }
} else {
  console.warn('⚠️  MongoDB connection string formatı tanınmadı, dbName option ile zorlanacak');
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    // dbName option'ı ile açıkça database adını belirt
    // Bu, connection string'deki database adını override eder ve her zaman 'dipol-butik' kullanır
    const opts = {
      bufferCommands: false,
      dbName: 'dipol-butik', // Her zaman 'dipol-butik' database'ini kullan
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      const dbName = mongoose.connection.db?.databaseName || 'unknown';
      console.log('✅ MongoDB bağlantısı başarılı. Database:', dbName);
      
      // Eğer yanlış database'e bağlanıldıysa uyar
      if (dbName !== 'dipol-butik') {
        console.warn(`⚠️  UYARI: Beklenen database 'dipol-butik' ama bağlanılan database: '${dbName}'`);
      }
      
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

