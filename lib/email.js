import nodemailer from 'nodemailer';

const getTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

export async function sendEmail(options) {
  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: `"Dipol Butik" <${process.env.SMTP_USER}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
  } catch (error) {
    console.error('Email gönderme hatası:', error);
    throw new Error('Email gönderilemedi: ' + error.message);
  }
}

export async function sendPasswordResetEmail(email, resetToken) {
  const frontendUrl = process.env.NODE_ENV === 'development' && !process.env.VERCEL
    ? 'http://localhost:3001'
    : 'https://www.dipolbutik.com';

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
        <div class="header"><h1>Dipol Butik</h1></div>
        <div class="content">
          <h2>Şifre Sıfırlama</h2>
          <p>Merhaba, Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın:</p>
          <p style="text-align: center;"><a href="${resetUrl}" class="button">Şifremi Sıfırla</a></p>
          <p>Bu bağlantı 1 saat süreyle geçerlidir.</p>
        </div>
        <div class="footer"><p>© ${new Date().getFullYear()} Dipol Butik</p></div>
      </div>
    </body>
    </html>
  `;
  await sendEmail({ to: email, subject: 'Şifre Sıfırlama - Dipol Butik', html, text: `Şifre sıfırlama: ${resetUrl}` });
}

export async function sendEmailVerificationEmail(email, verificationToken) {
  const isLocalDev = process.env.NODE_ENV === 'development' && !process.env.VERCEL && !process.env.VERCEL_ENV;
  const frontendUrl = isLocalDev ? 'http://localhost:3001' : 'https://www.dipolbutik.com';
  const verificationUrl = `${frontendUrl}/email-onay?token=${verificationToken}`;

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
        <div class="header"><h1>Dipol Butik</h1></div>
        <div class="content">
          <h2>E-posta Adresinizi Doğrulayın</h2>
          <p>Merhaba, Dipol Butik'e hoş geldiniz! Hesabınızı aktifleştirmek için aşağıdaki bağlantıya tıklayın:</p>
          <p style="text-align: center;"><a href="${verificationUrl}" class="button">E-postamı Doğrula</a></p>
          <p>Bu bağlantı 24 saat süreyle geçerlidir.</p>
        </div>
        <div class="footer"><p>© ${new Date().getFullYear()} Dipol Butik</p></div>
      </div>
    </body>
    </html>
  `;
  await sendEmail({ to: email, subject: 'E-posta Doğrulama - Dipol Butik', html, text: `E-posta doğrulama: ${verificationUrl}` });
}

