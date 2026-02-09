import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { getCorsHeaders } from '@/lib/cors';

export async function POST(request) {
  try {
    if (process.env.NODE_ENV === 'production') {
      const authHeader = request.headers.get('authorization');
      const secretKey = process.env.ADMIN_CREATE_SECRET || 'create-admin-secret-key-change-in-production';

      if (process.env.ADMIN_CREATE_SECRET && authHeader !== `Bearer ${secretKey}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: getCorsHeaders(request) });
      }
    }

    await connectDB();
    const dbName = mongoose.connection.db?.databaseName;
    const adminEmail = 'admin@dipolbutik.com';
    const adminPassword = 'C2z4duvd7sal';

    const existingAdmin = await User.findOne({ email: adminEmail }).select('+password');

    if (existingAdmin) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      existingAdmin.password = hashedPassword;
      existingAdmin.role = 'admin';
      existingAdmin.emailVerified = true;
      await existingAdmin.save();

      const passwordTest = await bcrypt.compare(adminPassword, existingAdmin.password);

      return NextResponse.json({
        message: 'Admin kullanıcısı güncellendi',
        database: dbName,
        admin: {
          email: existingAdmin.email,
          role: existingAdmin.role,
          id: existingAdmin._id,
          passwordTest,
        },
      }, { headers: getCorsHeaders(request) });
    } else {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      const adminUser = await User.create({
        name: 'Admin',
        email: adminEmail,
        password: hashedPassword,
        role: 'admin',
        emailVerified: true,
      });

      const passwordTest = await bcrypt.compare(adminPassword, adminUser.password);

      return NextResponse.json({
        message: 'Admin kullanıcısı oluşturuldu',
        database: dbName,
        admin: {
          email: adminUser.email,
          role: adminUser.role,
          id: adminUser._id,
          passwordTest,
        },
      }, { headers: getCorsHeaders(request) });
    }
  } catch (error) {
    return NextResponse.json({
      error: error.message || 'Admin oluşturma hatası',
      timestamp: new Date().toISOString(),
    }, { status: 500, headers: getCorsHeaders(request) });
  }
}

export async function GET(request) {
  return POST(request);
}

