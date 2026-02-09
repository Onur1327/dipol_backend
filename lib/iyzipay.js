import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

function cleanEnv(val, fallback) {
  if (!val) return fallback;
  return val.trim().replace(/^["']|["']$/g, '').trim();
}

function getIyzicoConfig() {
  return {
    apiKey: cleanEnv(process.env.IYZICO_API_KEY, ''),
    secretKey: cleanEnv(process.env.IYZICO_SECRET_KEY, ''),
    uri: cleanEnv(process.env.IYZICO_URI, 'https://api.iyzipay.com')
  };
}

function logToFile(title, data) {
  const logPath = path.join(process.cwd(), 'iyzico_manual.log');
  const timestamp = new Date().toISOString();
  const logMessage = `\n--- ${title} [${timestamp}] ---\n${typeof data === 'string' ? data : JSON.stringify(data, null, 2)}\n`;
  try {
    fs.appendFileSync(logPath, logMessage);
  } catch (err) {
    console.error('Log dosyasına yazılamadı:', err);
  }
}

function formatPrice(price) {
  if (price === null || price === undefined) return '0.00';
  return parseFloat(price).toFixed(2);
}

const Models = {
  address: (data) => (!data ? undefined : {
    address: data.address,
    zipCode: data.zipCode,
    contactName: data.contactName,
    city: data.city,
    country: data.country
  }),
  buyer: (data) => (!data ? undefined : {
    id: data.id,
    name: data.name,
    surname: data.surname,
    identityNumber: data.identityNumber,
    email: data.email,
    gsmNumber: data.gsmNumber,
    registrationDate: data.registrationDate,
    lastLoginDate: data.lastLoginDate,
    registrationAddress: data.registrationAddress,
    city: data.city,
    country: data.country,
    zipCode: data.zipCode,
    ip: data.ip === '::1' ? '127.0.0.1' : data.ip
  }),
  paymentCard: (data) => (!data ? undefined : {
    cardHolderName: data.cardHolderName,
    cardNumber: data.cardNumber,
    expireYear: data.expireYear,
    expireMonth: data.expireMonth,
    cvc: data.cvc,
    registerCard: data.registerCard || 0
  }),
  basketItem: (data) => {
    if (!data) return undefined;
    const item = {
      id: data.id,
      price: formatPrice(data.price),
      name: data.name,
      category1: data.category1,
      category2: data.category2,
      itemType: data.itemType
    };
    if (data.subMerchantKey) item.subMerchantKey = data.subMerchantKey;
    if (data.subMerchantPrice !== undefined && data.subMerchantPrice !== null) {
      item.subMerchantPrice = formatPrice(data.subMerchantPrice);
    }
    if (data.withholdingTax !== undefined && data.withholdingTax !== null) {
      item.withholdingTax = formatPrice(data.withholdingTax);
    }
    return item;
  },
  payment: (data) => {
    if (!data) return undefined;
    const p = {
      locale: data.locale || 'tr',
      conversationId: data.conversationId,
      price: formatPrice(data.price),
      paidPrice: formatPrice(data.paidPrice),
      installment: data.installment || '1',
      paymentChannel: data.paymentChannel || 'WEB',
      basketId: data.basketId,
      paymentCard: Models.paymentCard(data.paymentCard),
      buyer: Models.buyer(data.buyer),
      shippingAddress: Models.address(data.shippingAddress),
      billingAddress: Models.address(data.billingAddress),
      basketItems: (data.basketItems || []).map(Models.basketItem),
      currency: data.currency || 'TRY',
      callbackUrl: data.callbackUrl
    };
    if (data.paymentGroup) p.paymentGroup = data.paymentGroup;
    return p;
  }
};

function generateAuthorizationHeader(path, bodyJson, randomString) {
  const { apiKey, secretKey } = getIyzicoConfig();
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(randomString + path + bodyJson)
    .digest('hex');
  const authString = `apiKey:${apiKey}&randomKey:${randomString}&signature:${signature}`;
  return `IYZWSv2 ${Buffer.from(authString).toString('base64')}`;
}

async function iyzicoRequest(endpointPath, rawBody) {
  const config = getIyzicoConfig();
  const url = `${config.uri}${endpointPath}`;
  const filteredBody = Models.payment(rawBody);
  const bodyJson = JSON.stringify(filteredBody);
  const hrTime = process.hrtime();
  const randomString = hrTime[0].toString() + Math.random().toString().slice(2, 8);
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'x-iyzi-rnd': randomString,
    'x-iyzi-client-version': 'iyzipay-node-manual-1.0.3',
    'Authorization': generateAuthorizationHeader(endpointPath, bodyJson, randomString)
  };
  try {
    const response = await fetch(url, { method: 'POST', headers, body: bodyJson });
    const data = await response.json();
    if (data.threeDSHtmlContent) {
      try {
        data.threeDSHtmlContent = Buffer.from(data.threeDSHtmlContent, 'base64').toString('utf8');
      } catch (e) { }
    }
    return data;
  } catch (err) {
    return { status: 'failure', errorMessage: err.message };
  }
}

export async function initializePayment(data) {
  return iyzicoRequest('/payment/3dsecure/initialize', data);
}

export async function retrievePayment(paymentId) {
  return iyzicoRequest('/payment/detail', { paymentId, locale: 'tr' });
}

export async function auth3D(paymentId, conversationId) {
  return iyzicoRequest('/payment/3dsecure/auth', { paymentId, conversationId, locale: 'tr' });
}
