import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Çevresel değişkenleri tırnak ve boşluklardan arındıran yardımcı
function cleanEnv(val: string | undefined, fallback: string): string {
  if (!val) return fallback;
  return val.trim().replace(/^["']|["']$/g, '').trim();
}

// Yapılandırma
function getIyzicoConfig() {
  return {
    apiKey: cleanEnv(process.env.IYZICO_API_KEY, 'm31lBTyOx6OXtqHbdNBsZBB9wROL91hH'),
    secretKey: cleanEnv(process.env.IYZICO_SECRET_KEY, 'F8JOzRxuEltabMCYammBPOKnvmLpS0nb'),
    uri: cleanEnv(process.env.IYZICO_URI, 'https://sandbox-api.iyzipay.com')
  };
}

// Log fonksiyonu
function logToFile(title: string, data: any) {
  const logPath = path.join(process.cwd(), 'iyzico_manual.log');
  const timestamp = new Date().toISOString();
  const logMessage = `\n--- ${title} [${timestamp}] ---\n${typeof data === 'string' ? data : JSON.stringify(data, null, 2)}\n`;
  try {
    fs.appendFileSync(logPath, logMessage);
  } catch (err) {
    console.error('Log dosyasına yazılamadı:', err);
  }
}

// SDK Birebir Fiyat Formatlama
function formatPrice(price: any): string {
  if (price === null || price === undefined) return '0.0';
  let resultPrice = parseFloat(price).toString();
  if (resultPrice.indexOf('.') === -1) {
    return resultPrice + '.0';
  }
  return resultPrice;
}

// SDK Model Filtreleme Mantığı (Order ve Key filtering)
const Models = {
  address: (data: any) => (!data ? undefined : {
    address: data.address,
    zipCode: data.zipCode,
    contactName: data.contactName,
    city: data.city,
    country: data.country
  }),
  buyer: (data: any) => (!data ? undefined : {
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
  paymentCard: (data: any) => (!data ? undefined : {
    cardHolderName: data.cardHolderName,
    cardNumber: data.cardNumber,
    expireYear: data.expireYear,
    expireMonth: data.expireMonth,
    cvc: data.cvc,
    registerCard: data.registerCard || 0
  }),
  basketItem: (data: any) => {
    if (!data) return undefined;
    const item: any = {
      id: data.id,
      price: formatPrice(data.price),
      name: data.name,
      category1: data.category1,
      category2: data.category2,
      itemType: data.itemType
    };
    // Sadece varsa ekle (Pazaryeri kontrolü için kritik!)
    if (data.subMerchantKey) item.subMerchantKey = data.subMerchantKey;
    if (data.subMerchantPrice !== undefined && data.subMerchantPrice !== null) {
      item.subMerchantPrice = formatPrice(data.subMerchantPrice);
    }
    if (data.withholdingTax !== undefined && data.withholdingTax !== null) {
      item.withholdingTax = formatPrice(data.withholdingTax);
    }
    return item;
  },
  payment: (data: any) => {
    if (!data) return undefined;
    const p: any = {
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

// V2 Authorization (SDK Birebir Klon)
function generateAuthorizationHeader(path: string, bodyJson: string, randomString: string) {
  const { apiKey, secretKey } = getIyzicoConfig();

  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(randomString + path + bodyJson)
    .digest('hex');

  const authString = `apiKey:${apiKey}&randomKey:${randomString}&signature:${signature}`;
  return `IYZWSv2 ${Buffer.from(authString).toString('base64')}`;
}

// Ortak Request Fonksiyonu
async function iyzicoRequest(endpointPath: string, rawBody: any) {
  const config = getIyzicoConfig();
  const url = `${config.uri}${endpointPath}`;

  // Veriyi SDK'nın yaptığı gibi filtrele (Bu adım kritik!)
  const filteredBody = Models.payment(rawBody);
  const bodyJson = JSON.stringify(filteredBody);

  // Random String (SDK Klon)
  const hrTime = process.hrtime();
  const randomString = hrTime[0].toString() + Math.random().toString().slice(2, 8);

  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'x-iyzi-rnd': randomString,
    'x-iyzi-client-version': 'iyzipay-node-manual-1.0.3',
    'Authorization': generateAuthorizationHeader(endpointPath, bodyJson, randomString)
  };

  logToFile('Filtered Request Start', {
    url,
    apiKey: config.apiKey.substring(0, 4) + '...',
    body: filteredBody
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: bodyJson
    });

    const data = await response.json();

    // Base64 HTML içeriğini çözümle (Frontend'in anlayabilmesi için)
    if (data.threeDSHtmlContent) {
      try {
        data.threeDSHtmlContent = Buffer.from(data.threeDSHtmlContent, 'base64').toString('utf8');
      } catch (e) {
        logToFile('Base64 Decode Error', e);
      }
    }

    logToFile('Request Result', data);
    return data;
  } catch (err: any) {
    logToFile('Request ERROR', { message: err.message });
    return { status: 'failure', errorMessage: err.message };
  }
}

export async function initializePayment(data: any): Promise<any> {
  return iyzicoRequest('/payment/3dsecure/initialize', data);
}

export async function retrievePayment(paymentId: string): Promise<any> {
  return iyzicoRequest('/payment/detail', { paymentId, locale: 'tr' });
}

export async function auth3D(paymentId: string, conversationId: string): Promise<any> {
  return iyzicoRequest('/payment/3dsecure/auth', { paymentId, conversationId, locale: 'tr' });
}
