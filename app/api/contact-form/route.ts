import { NextRequest, NextResponse } from 'next/server';
import { getCorsHeaders } from '@/lib/cors';
import { sendEmail } from '@/lib/email';

// OPTIONS handler for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeaders(request),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    // Validasyon
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'Tüm alanlar doldurulmalıdır' },
        { 
          status: 400,
          headers: getCorsHeaders(request),
        }
      );
    }

    // Email validasyonu
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Geçerli bir e-posta adresi giriniz' },
        { 
          status: 400,
          headers: getCorsHeaders(request),
        }
      );
    }

    // Admin email adresi
    const adminEmail = process.env.ADMIN_EMAIL || 'dipolbutik@gmail.com';

    // Email HTML içeriği
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #D4A574; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9fafb; padding: 30px; }
          .info-box { background-color: white; padding: 15px; margin: 10px 0; border-left: 4px solid #D4A574; }
          .label { font-weight: bold; color: #666; }
          .value { margin-top: 5px; }
          .message-box { background-color: white; padding: 20px; margin: 15px 0; border: 1px solid #e5e7eb; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Yeni İletişim Formu Mesajı</h1>
          </div>
          <div class="content">
            <p>Web sitenizden yeni bir iletişim formu mesajı alındı:</p>
            
            <div class="info-box">
              <div class="label">Gönderen Bilgileri:</div>
              <div class="value">
                <strong>Ad Soyad:</strong> ${name}<br>
                <strong>E-posta:</strong> ${email}
              </div>
            </div>
            
            <div class="info-box">
              <div class="label">Konu:</div>
              <div class="value">${subject}</div>
            </div>
            
            <div class="message-box">
              <div class="label">Mesaj:</div>
              <div class="value">${message.replace(/\n/g, '<br>')}</div>
            </div>
            
            <div class="info-box">
              <div class="label">Tarih:</div>
              <div class="value">${new Date().toLocaleString('tr-TR')}</div>
            </div>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Dipol Butik. Tüm hakları saklıdır.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await sendEmail({
        to: adminEmail,
        subject: `Yeni İletişim Formu Mesajı - ${subject}`,
        html: emailHtml,
        text: `
Yeni İletişim Formu Mesajı

Gönderen: ${name}
E-posta: ${email}
Konu: ${subject}

Mesaj:
${message}

Tarih: ${new Date().toLocaleString('tr-TR')}
        `,
      });
    } catch (emailError) {
      console.error('Email gönderme hatası:', emailError);
      return NextResponse.json(
        { error: 'Mesaj gönderilemedi. Lütfen tekrar deneyin.' },
        { 
          status: 500,
          headers: getCorsHeaders(request),
        }
      );
    }

    return NextResponse.json(
      { message: 'Mesajınız başarıyla gönderildi. En kısa sürede size dönüş yapacağız.' },
      {
        headers: getCorsHeaders(request),
      }
    );
  } catch (error: any) {
    console.error('İletişim formu hatası:', error);
    return NextResponse.json(
      { error: error.message || 'Mesaj gönderilemedi' },
      { 
        status: 500,
        headers: getCorsHeaders(request),
      }
    );
  }
}

