import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Contact from '@/models/Contact';
import { getCurrentUser } from '@/lib/auth';
import { getCorsHeaders } from '@/lib/cors';

// OPTIONS handler for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeaders(request),
  });
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Tek bir iletişim bilgisi kaydı olacak
    let contact = await Contact.findOne().lean();

    // Eğer yoksa varsayılan bir kayıt oluştur
    if (!contact) {
      contact = await Contact.create({
        companyName: 'Dipol Butik',
        email: 'info@dipolbutik.com',
        phone: '+90 555 123 4567',
        whatsappNumber: '05074143895',
        address: 'Örnek Mahalle, Örnek Sokak No:1',
        city: 'İstanbul',
        postalCode: '34000',
        country: 'Türkiye',
      });
    }

    return NextResponse.json(contact, {
      headers: getCorsHeaders(request),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'İletişim bilgileri getirilemedi' },
      { 
        status: 500,
        headers: getCorsHeaders(request),
      }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Yetkisiz erişim' },
        { 
          status: 401,
          headers: getCorsHeaders(request),
        }
      );
    }

    await connectDB();

    const body = await request.json();

    // Tek bir kayıt olacak, varsa güncelle, yoksa oluştur
    const contact = await Contact.findOneAndUpdate(
      {},
      body,
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    return NextResponse.json(contact, {
      headers: getCorsHeaders(request),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'İletişim bilgileri güncellenemedi' },
      { 
        status: 500,
        headers: getCorsHeaders(request),
      }
    );
  }
}

