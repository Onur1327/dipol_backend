import { z } from 'zod';

export function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  return input
    .trim()
    .replace(/<[^>]*>/g, '')
    .replace(/[<>]/g, '')
    .replace(/['";\\]/g, '')
    .replace(/\s+/g, ' ');
}

export function sanitizeEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const sanitized = email.trim().toLowerCase();
  if (!emailRegex.test(sanitized)) {
    throw new Error('Geçersiz e-posta formatı');
  }
  return sanitized;
}

export function validatePasswordStrength(password) {
  if (password.length < 8) return { valid: false, message: 'Şifre en az 8 karakter olmalıdır' };
  if (!/[A-Z]/.test(password)) return { valid: false, message: 'Büyük harf gereklidir' };
  if (!/[a-z]/.test(password)) return { valid: false, message: 'Küçük harf gereklidir' };
  if (!/[0-9]/.test(password)) return { valid: false, message: 'Rakam gereklidir' };
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return { valid: false, message: 'Özel karakter gereklidir' };
  return { valid: true };
}

export function isValidObjectId(id) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

export function validateEnvironmentVariables() {
  const requiredVars = ['JWT_SECRET', 'database_url'];
  const missing = [];
  for (const varName of requiredVars) {
    if (!process.env[varName]) missing.push(varName);
  }
  if (missing.length > 0) {
    throw new Error(`Eksik environment variables: ${missing.join(', ')}`);
  }
}

export function sanitizeQuery(query) {
  if (typeof query !== 'object' || query === null) return query;
  const sanitized = {};
  for (const [key, value] of Object.entries(query)) {
    if (key.startsWith('$') && !['$and', '$or', '$nor'].includes(key)) continue;
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

export function validateBodySize(body, maxSize = 1024 * 1024) {
  if (body.length > maxSize) throw new Error('Request body çok büyük');
}

export function safeParse(schema, data) {
  try {
    const result = schema.safeParse(data);
    if (result.success) return { success: true, data: result.data };
    return { success: false, error: result.error.issues[0]?.message || 'Validation hatası' };
  } catch (error) {
    return { success: false, error: error.message || 'Validation hatası' };
  }
}

export function validateTCIdentityNumber(tcNo) {
  if (!/^\d+$/.test(tcNo)) return { valid: false, message: 'Sadece rakam olmalı' };
  if (tcNo.length !== 11) return { valid: false, message: '11 hane olmalı' };
  if (tcNo[0] === '0') return { valid: false, message: '0 ile başlayamaz' };
  if (/^(\d)\1{10}$/.test(tcNo)) return { valid: false, message: 'Geçersiz TC' };
  const digits = tcNo.split('').map(Number);
  const sum1 = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const sum2 = digits[1] + digits[3] + digits[5] + digits[7];
  const checkDigit10 = (sum1 * 7 - sum2) % 10;
  const finalCheck10 = checkDigit10 < 0 ? checkDigit10 + 10 : checkDigit10;
  if (finalCheck10 !== digits[9]) return { valid: false, message: 'Geçersiz TC' };
  const sumAll = digits.slice(0, 10).reduce((a, b) => a + b, 0);
  if (sumAll % 10 !== digits[10]) return { valid: false, message: 'Geçersiz TC' };
  return { valid: true };
}

