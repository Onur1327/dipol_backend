import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { getCorsHeaders } from '@/lib/cors';

// Test endpoint - admin kullanıcısını ve şifre doğrulamasını test eder
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const dbName = mongoose.connection.db?.databaseName;
    const adminEmail = 'admin@dipolbutik.com';
    const testPassword = 'C2z4duvd7sal';
    
    // Admin kullanıcısını bul
    const admin = await User.findOne({ email: adminEmail }).select('+password');
    
    let passwordTest = false;
    if (admin && admin.password) {
      passwordTest = await bcrypt.compare(testPassword, admin.password);
    }
    
    // Tüm kullanıcıları listele
    const allUsers = await User.find({}).select('email role');
    
    return NextResponse.json({
      database: dbName,
      adminFound: !!admin,
      adminEmail: admin?.email,
      adminRole: admin?.role,
      passwordTest: passwordTest,
      passwordHashExists: !!admin?.password,
      allUsers: allUsers,
      timestamp: new Date().toISOString(),
    }, {
      headers: getCorsHeaders(request),
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      timestamp: new Date().toISOString(),
    }, {
      status: 500,
      headers: getCorsHeaders(request),
    });
  }
}

