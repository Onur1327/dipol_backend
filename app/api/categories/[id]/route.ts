import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Category from '@/models/Category';
import { getCurrentUser } from '@/lib/auth';
import { getCorsHeaders } from '@/lib/cors';

// OPTIONS handler for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeaders(request),
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await request.json();
    
    // parent boş string ise null yap
    if (body.parent === '' || body.parent === null || body.parent === undefined) {
      body.parent = null;
    }
    
    const category = await Category.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Kategori bulunamadı' },
        { 
          status: 404,
          headers: getCorsHeaders(request),
        }
      );
    }

    return NextResponse.json(category, {
      headers: getCorsHeaders(request),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Kategori güncellenemedi' },
      { 
        status: 500,
        headers: getCorsHeaders(request),
      }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const category = await Category.findByIdAndDelete(id);
    if (!category) {
      return NextResponse.json(
        { error: 'Kategori bulunamadı' },
        { 
          status: 404,
          headers: getCorsHeaders(request),
        }
      );
    }

    return NextResponse.json({ message: 'Kategori silindi' }, {
      headers: getCorsHeaders(request),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Kategori silinemedi' },
      { 
        status: 500,
        headers: getCorsHeaders(request),
      }
    );
  }
}

