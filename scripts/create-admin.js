import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import connectDB from '../lib/mongodb';
import User from '../models/User';
import bcrypt from 'bcryptjs';

async function createAdmin() {
  try {
    await connectDB();
    console.log('MongoDB bağlantısı başarılı');

    const adminEmail = 'admin@dipolbutik.com';
    const adminPassword = 'C2z4duvd7sal';

    await User.deleteOne({ email: adminEmail });
    console.log('Mevcut admin kullanıcısı temizlendi (varsa)');

    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const adminUser = await User.create({
      name: 'Admin',
      email: adminEmail,
      password: hashedPassword,
      role: 'admin',
      emailVerified: true,
    });

    console.log('✅ Admin kullanıcısı oluşturuldu');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Şifre: ${adminPassword}`);
    console.log(`   Role: ${adminUser.role}`);
    console.log(`   ID: ${adminUser._id}`);

    const verifyUser = await User.findOne({ email: adminEmail }).select('+password');
    if (verifyUser) {
      const passwordMatch = await bcrypt.compare(adminPassword, verifyUser.password);
      console.log(`   Şifre doğrulama: ${passwordMatch ? '✅ Başarılı' : '❌ Başarısız'}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Admin oluşturma hatası:', error);
    process.exit(1);
  }
}

createAdmin();

