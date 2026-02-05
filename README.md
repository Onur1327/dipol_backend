# Dipol Butik - Backend API

Kadın giyim e-ticaret sitesi için Next.js tabanlı backend API.

## Özellikler

- RESTful API endpoints
- JWT tabanlı authentication
- MongoDB veritabanı entegrasyonu
- Ürün, kategori ve sipariş yönetimi
- Admin yetkilendirme sistemi

## Kurulum

1. Bağımlılıkları yükleyin:
```bash
npm install
```

2. `.env.local` dosyasını oluşturun:
```env
database_url=mongodb://localhost:27017/dipol-butik
JWT_SECRET=your-super-secret-jwt-key-change-in-production-12345
PORT=3002
```

3. MongoDB'yi başlatın (macOS için):
```bash
brew services start mongodb-community
```

4. Veritabanını seed edin:
```bash
npm run seed
```

5. Development server'ı başlatın:
```bash
npm run dev
```

Backend API `http://localhost:3002` adresinde çalışacaktır.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Kullanıcı kaydı
- `POST /api/auth/login` - Kullanıcı girişi

### Products
- `GET /api/products` - Ürünleri listele
- `GET /api/products/:id` - Ürün detayı
- `POST /api/products` - Yeni ürün oluştur (Admin)
- `PUT /api/products/:id` - Ürün güncelle (Admin)
- `DELETE /api/products/:id` - Ürün sil (Admin)

### Categories
- `GET /api/categories` - Kategorileri listele
- `POST /api/categories` - Yeni kategori oluştur (Admin)

### Orders
- `GET /api/orders` - Siparişleri listele
- `GET /api/orders/:id` - Sipariş detayı
- `POST /api/orders` - Yeni sipariş oluştur
- `PUT /api/orders/:id` - Sipariş güncelle (Admin)

## Demo Kullanıcılar

Seed script çalıştırıldıktan sonra:

**Admin:**
- Email: admin@dipolbutik.com
- Şifre: admin123

**Test Kullanıcı:**
- Email: test@dipolbutik.com
- Şifre: admin123
