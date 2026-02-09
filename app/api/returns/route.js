import { NextResponse } from 'next/server';
import connectDB from '../../../lib/mongodb.js';
import { getCurrentUser } from '../../../lib/auth.js';
import { getCorsHeaders } from '../../../lib/cors.js';
import { sendEmail } from '../../../lib/email.js';
import User from '../../../models/User.js';

export async function OPTIONS(request) {
  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeaders(request),
  });
}

export async function POST(request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401, headers: getCorsHeaders(request) });

    await connectDB();
    const userDoc = await User.findById(user.userId).select('name email').lean();
    const userName = userDoc?.name || user.email || 'Bilinmiyor';

    const body = await request.json();
    const { orderNumber, reason, description, contactPhone, contactEmail } = body;

    if (!orderNumber || !reason || !description || !contactPhone || !contactEmail) {
      return NextResponse.json({ error: 'Tüm alanlar doldurulmalıdır' }, { status: 400, headers: getCorsHeaders(request) });
    }

    const reasonTexts = {
      size: 'Beden uyumsuzluğu',
      color: 'Renk uyumsuzluğu',
      defect: 'Ürün hatası',
      wrong: 'Yanlış ürün gönderildi',
      other: 'Diğer',
    };

    const reasonText = reasonTexts[reason] || reason;
    const adminEmail = process.env.ADMIN_EMAIL || 'dipolbutik@gmail.com';

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
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>Yeni İade Talebi</h1></div>
          <div class="content">
            <p>Yeni bir iade talebi alındı:</p>
            <div class="info-box">
              <div class="label">Müşteri Bilgileri:</div>
              <div class="value"><strong>Ad Soyad:</strong> ${userName}<br><strong>E-posta:</strong> ${contactEmail}<br><strong>Telefon:</strong> ${contactPhone}</div>
            </div>
            <div class="info-box"><div class="label">Sipariş Numarası:</div><div class="value">${orderNumber}</div></div>
            <div class="info-box"><div class="label">İade Nedeni:</div><div class="value">${reasonText}</div></div>
            <div class="info-box"><div class="label">Açıklama:</div><div class="value">${description.replace(/\n/g, '<br>')}</div></div>
            <div class="info-box"><div class="label">Tarih:</div><div class="value">${new Date().toLocaleString('tr-TR')}</div></div>
          </div>
          <div class="footer"><p>© ${new Date().getFullYear()} Dipol Butik. Tüm hakları saklıdır.</p></div>
        </div>
      </body>
      </html>
    `;

    try {
      await sendEmail({
        to: adminEmail,
        subject: `Yeni İade Talebi - Sipariş #${orderNumber}`,
        html: emailHtml,
        text: `Yeni İade Talebi\n\nMüşteri: ${userName}\nE-posta: ${contactEmail}\nTelefon: ${contactPhone}\nSipariş No: ${orderNumber}\nİade Nedeni: ${reasonText}\nAçıklama: ${description}\nTarih: ${new Date().toLocaleString('tr-TR')}`,
      });
    } catch (emailError) { }

    return NextResponse.json({ message: 'İade talebiniz alınmıştır. En kısa sürede size dönüş yapacağız.' }, { headers: getCorsHeaders(request) });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'İade talebi oluşturulamadı' }, { status: 500, headers: getCorsHeaders(request) });
  }
}

