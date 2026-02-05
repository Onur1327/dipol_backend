import { z } from 'zod';

/**
 * Input sanitization - XSS ve injection saldırılarına karşı koruma
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    // HTML tag'lerini kaldır
    .replace(/<[^>]*>/g, '')
    // Tehlikeli karakterleri temizle
    .replace(/[<>]/g, '')
    // SQL injection karakterlerini temizle
    .replace(/['";\\]/g, '')
    // Çoklu boşlukları tek boşluğa çevir
    .replace(/\s+/g, ' ');
}

/**
 * Email validation ve sanitization
 */
export function sanitizeEmail(email: string): string {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const sanitized = email.trim().toLowerCase();
  
  if (!emailRegex.test(sanitized)) {
    throw new Error('Geçersiz e-posta formatı');
  }
  
  return sanitized;
}

/**
 * Password güç kontrolü
 */
export function validatePasswordStrength(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Şifre en az 8 karakter olmalıdır' };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Şifre en az bir büyük harf içermelidir' };
  }
  
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Şifre en az bir küçük harf içermelidir' };
  }
  
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Şifre en az bir rakam içermelidir' };
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { valid: false, message: 'Şifre en az bir özel karakter içermelidir' };
  }
  
  return { valid: true };
}

/**
 * MongoDB ObjectId validation
 */
export function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

/**
 * Environment variables güvenlik kontrolü
 */
export function validateEnvironmentVariables(): void {
  const requiredVars = [
    'JWT_SECRET',
    'database_url',
  ];
  
  const missing: string[] = [];
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }
  
  if (missing.length > 0) {
    throw new Error(
      `Eksik environment variables: ${missing.join(', ')}\n` +
      'Lütfen .env.local dosyasını kontrol edin.'
    );
  }
  
  // JWT_SECRET güvenlik kontrolü
  const jwtSecret = process.env.JWT_SECRET || '';
  if (jwtSecret.length < 32) {
    console.warn('⚠️  UYARI: JWT_SECRET çok kısa. En az 32 karakter olmalıdır.');
  }
  
  if (jwtSecret === 'your-secret-key' || jwtSecret.includes('change-in-production')) {
    console.error('❌ HATA: JWT_SECRET production değeri kullanılıyor! Lütfen güvenli bir secret key oluşturun.');
    throw new Error('JWT_SECRET güvenli değil. Lütfen production için güvenli bir secret key kullanın.');
  }
  
  // Production'da HTTPS kontrolü
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.NEXT_PUBLIC_FRONTEND_URL?.startsWith('https://')) {
      console.warn('⚠️  UYARI: Production ortamında HTTPS kullanılmalıdır.');
    }
  }
}

/**
 * SQL Injection ve NoSQL Injection koruması için query sanitization
 */
export function sanitizeQuery(query: any): any {
  if (typeof query !== 'object' || query === null) {
    return query;
  }
  
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(query)) {
    // Tehlikeli MongoDB operatörlerini filtrele
    if (key.startsWith('$') && !['$and', '$or', '$nor'].includes(key)) {
      continue; // Tehlikeli operatörleri atla
    }
    
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeQuery(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Request body size limit kontrolü (DoS koruması)
 */
export function validateBodySize(body: string, maxSize: number = 1024 * 1024): void {
  if (body.length > maxSize) {
    throw new Error('Request body çok büyük');
  }
}

/**
 * Zod schema ile güvenli validation
 */
export function safeParse<T>(schema: z.ZodSchema<T>, data: unknown): { success: boolean; data?: T; error?: string } {
  try {
    const result = schema.safeParse(data);
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      return {
        success: false,
        error: result.error.issues[0]?.message || 'Validation hatası',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Validation hatası',
    };
  }
}

/**
 * TC Kimlik Numarası Doğrulama
 * TC Kimlik numarası 11 haneli olmalı, ilk hane 0 olamaz ve algoritma kontrolü yapılır
 */
export function validateTCIdentityNumber(tcNo: string): { valid: boolean; message?: string } {
  // Sadece rakam kontrolü
  if (!/^\d+$/.test(tcNo)) {
    return { valid: false, message: 'TC Kimlik numarası sadece rakamlardan oluşmalıdır' };
  }

  // 11 haneli olmalı
  if (tcNo.length !== 11) {
    return { valid: false, message: 'TC Kimlik numarası 11 haneli olmalıdır' };
  }

  // İlk hane 0 olamaz
  if (tcNo[0] === '0') {
    return { valid: false, message: 'TC Kimlik numarası 0 ile başlayamaz' };
  }

  // Tüm haneler aynı olamaz (11111111111 gibi)
  if (/^(\d)\1{10}$/.test(tcNo)) {
    return { valid: false, message: 'Geçersiz TC Kimlik numarası' };
  }

  // Algoritma kontrolü
  const digits = tcNo.split('').map(Number);
  
  // 10. hane kontrolü
  const sum1 = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const sum2 = digits[1] + digits[3] + digits[5] + digits[7];
  const checkDigit10 = (sum1 * 7 - sum2) % 10;
  if (checkDigit10 < 0) {
    const checkDigit10Corrected = checkDigit10 + 10;
    if (checkDigit10Corrected !== digits[9]) {
      return { valid: false, message: 'Geçersiz TC Kimlik numarası' };
    }
  } else {
    if (checkDigit10 !== digits[9]) {
      return { valid: false, message: 'Geçersiz TC Kimlik numarası' };
    }
  }

  // 11. hane kontrolü
  const sumAll = digits.slice(0, 10).reduce((a, b) => a + b, 0);
  const checkDigit11 = sumAll % 10;
  if (checkDigit11 !== digits[10]) {
    return { valid: false, message: 'Geçersiz TC Kimlik numarası' };
  }

  return { valid: true };
}

