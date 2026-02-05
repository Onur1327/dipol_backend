import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { getCorsHeaders } from '@/lib/cors';

// Vercel'de admin kullanıcısı oluşturmak için endpoint
// Not: Production'da bu endpoint'i kaldırmak veya secret key ile korumak önerilir
export async function POST(request: NextRequest) {
  try {
    // Basit güvenlik: Sadece production'da secret key kontrolü
    // Development'ta direkt çalışabilir
    if (process.env.NODE_ENV === 'production') {
      const authHeader = request.headers.get('authorization');
      const secretKey = process.env.ADMIN_CREATE_SECRET || 'create-admin-secret-key-change-in-production';
      
      // Eğer secret key ayarlanmışsa kontrol et, yoksa direkt geç
      if (process.env.ADMIN_CREATE_SECRET && authHeader !== `Bearer ${secretKey}`) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { 
            status: 401,
            headers: getCorsHeaders(request),
          }
        );
      }
    }

    await connectDB();
    
    const dbName = mongoose.connection.db?.databaseName;
    console.log('[CREATE-ADMIN] Bağlanılan database:', dbName);

    const adminEmail = 'admin@dipolbutik.com';
    const adminPassword = 'C2z4duvd7sal';
    
    // Mevcut admin kullanıcısını kontrol et
    const existingAdmin = await User.findOne({ email: adminEmail }).select('+password');
    
    if (existingAdmin) {
      // Mevcut admin kullanıcısının şifresini güncelle
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      existingAdmin.password = hashedPassword;
      existingAdmin.role = 'admin';
      existingAdmin.emailVerified = true;
      await existingAdmin.save();
      
      // Şifre doğrulaması
      const passwordTest = await bcrypt.compare(adminPassword, existingAdmin.password);
      
      return NextResponse.json({
        message: 'Admin kullanıcısı güncellendi',
        database: dbName,
        admin: {
          email: existingAdmin.email,
          role: existingAdmin.role,
          id: existingAdmin._id,
          passwordTest: passwordTest,
        },
      }, {
        headers: getCorsHeaders(request),
      });
    } else {
      // Yeni admin kullanıcısı oluştur
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      const adminUser = await User.create({
        name: 'Admin',
        email: adminEmail,
        password: hashedPassword,
        role: 'admin',
        emailVerified: true,
      });
      
      // Şifre doğrulaması
      const passwordTest = await bcrypt.compare(adminPassword, adminUser.password);
      
      return NextResponse.json({
        message: 'Admin kullanıcısı oluşturuldu',
        database: dbName,
        admin: {
          email: adminUser.email,
          role: adminUser.role,
          id: adminUser._id,
          passwordTest: passwordTest,
        },
      }, {
        headers: getCorsHeaders(request),
      });
    }
  } catch (error: any) {
    console.error('[CREATE-ADMIN] Error:', error);
    return NextResponse.json({
      error: error.message || 'Admin oluşturma hatası',
      timestamp: new Date().toISOString(),
    }, {
      status: 500,
      headers: getCorsHeaders(request),
    });
  }
}

// GET ile de çalışabilir (test için)
export async function GET(request: NextRequest) {
  return POST(request);
}

