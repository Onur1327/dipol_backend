import nodemailer from 'nodemailer';

// SMTP ayarları
const getTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    const transporter = getTransporter();
    
    await transporter.sendMail({
      from: `"Dipol Butik" <${process.env.SMTP_USER}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
  } catch (error: any) {
    console.error('Email gönderme hatası:', error);
    throw new Error('Email gönderilemedi: ' + error.message);
  }
}

// Şifre sıfırlama email'i
export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
  // Her zaman www.dipolbutik.com kullan (sadece development'ta localhost)
  let frontendUrl: string;
  if (process.env.NODE_ENV === 'development' && !process.env.VERCEL) {
    // Sadece gerçek development ortamında localhost kullan
    frontendUrl = 'http://localhost:3001';
  } else {
    // Production, Vercel veya başka bir ortamda her zaman www.dipolbutik.com kullan
    frontendUrl = 'https://www.dipolbutik.com';
  }
  const resetUrl = `${frontendUrl}/sifre-sifirla?token=${resetToken}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
        .content { background-color: #f9fafb; padding: 30px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Dipol Butik</h1>
        </div>
        <div class="content">
          <h2>Şifre Sıfırlama</h2>
          <p>Merhaba,</p>
          <p>Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın:</p>
          <p style="text-align: center;">
            <a href="${resetUrl}" class="button">Şifremi Sıfırla</a>
          </p>
          <p>Bu bağlantı 1 saat süreyle geçerlidir.</p>
          <p>Eğer bu işlemi siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Dipol Butik. Tüm hakları saklıdır.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: 'Şifre Sıfırlama - Dipol Butik',
    html,
    text: `Şifrenizi sıfırlamak için bu bağlantıya tıklayın: ${resetUrl}`,
  });
}

// Email doğrulama email'i
export async function sendEmailVerificationEmail(email: string, verificationToken: string): Promise<void> {
  // Production'da KESIN OLARAK www.dipolbutik.com kullan
  // Environment variable'lara HİÇ BAKMA
  let frontendUrl: string;
  
  // Sadece gerçek local development'ta (localhost çalışıyorsa) localhost kullan
  // Diğer TÜM durumlarda (Vercel, production, staging) www.dipolbutik.com kullan
  const isLocalDev = process.env.NODE_ENV === 'development' && 
                     !process.env.VERCEL && 
                     !process.env.VERCEL_ENV;
  
  if (isLocalDev) {
    frontendUrl = 'http://localhost:3001';
  } else {
    // Her durumda (production, Vercel, staging) www.dipolbutik.com kullan
    // Environment variable'lara bakmadan direkt www.dipolbutik.com
    frontendUrl = 'https://www.dipolbutik.com';
  }
  
  const verificationUrl = `${frontendUrl}/email-onay?token=${verificationToken}`;
  
  console.log('[Email Verification] Sending verification email to:', email);
  console.log('[Email Verification] NODE_ENV:', process.env.NODE_ENV);
  console.log('[Email Verification] VERCEL:', process.env.VERCEL);
  console.log('[Email Verification] VERCEL_ENV:', process.env.VERCEL_ENV);
  console.log('[Email Verification] Is Local Dev:', isLocalDev);
  console.log('[Email Verification] Frontend URL (FINAL):', frontendUrl);
  console.log('[Email Verification] Verification URL (FINAL):', verificationUrl);
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #D4A574; color: white; padding: 20px; text-align: center; }
        .content { background-color: #f9fafb; padding: 30px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #D4A574; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Dipol Butik</h1>
        </div>
        <div class="content">
          <h2>E-posta Adresinizi Doğrulayın</h2>
          <p>Merhaba,</p>
          <p>Dipol Butik'e hoş geldiniz! Hesabınızı aktifleştirmek için aşağıdaki bağlantıya tıklayın:</p>
          <p style="text-align: center;">
            <a href="${verificationUrl}" class="button">E-postamı Doğrula</a>
          </p>
          <p>Bu bağlantı 24 saat süreyle geçerlidir.</p>
          <p>Eğer bu işlemi siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.</p>
          <p>Bağlantı çalışmıyorsa, aşağıdaki URL'yi tarayıcınıza yapıştırabilirsiniz:</p>
          <p style="word-break: break-all; color: #666; font-size: 12px;">${verificationUrl}</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Dipol Butik. Tüm hakları saklıdır.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: 'E-posta Adresinizi Doğrulayın - Dipol Butik',
    html,
    text: `E-posta adresinizi doğrulamak için bu bağlantıya tıklayın: ${verificationUrl}`,
  });
}

