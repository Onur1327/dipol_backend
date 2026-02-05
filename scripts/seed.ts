import dotenv from 'dotenv';
import { resolve } from 'path';

// .env.local dosyasını yükle
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import connectDB from '../lib/mongodb';
import User from '../models/User';
import Category from '../models/Category';
import Product from '../models/Product';
import bcrypt from 'bcryptjs';

async function seed() {
  try {
    await connectDB();
    console.log('MongoDB bağlantısı başarılı');

    // Kullanıcıları temizle ve oluştur
    await User.deleteMany({});
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const adminUser = await User.create({
      name: 'Admin',
      email: 'admin@dipolbutik.com',
      password: hashedPassword,
      role: 'admin',
    });

    const testUser = await User.create({
      name: 'Test Kullanıcı',
      email: 'test@dipolbutik.com',
      password: hashedPassword,
      role: 'user',
    });

    console.log('Kullanıcılar oluşturuldu');

    // Kategorileri temizle ve oluştur
    await Category.deleteMany({});
    
    const categories = await Category.insertMany([
      {
        name: 'Elbise',
        slug: 'elbise',
        description: 'Şık ve modern elbiseler - günlük, iş ve özel günler için',
        image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&h=400&fit=crop',
      },
      {
        name: 'Gömlek & Bluz',
        slug: 'gomlek-bluz',
        description: 'Klasik ve modern gömlekler, bluzlar',
        image: 'https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=400&h=400&fit=crop',
      },
      {
        name: 'Pantolon',
        slug: 'pantolon',
        description: 'Rahat ve şık pantolonlar - dar, geniş, klasik kesim',
        image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=400&fit=crop',
      },
      {
        name: 'Etek',
        slug: 'etek',
        description: 'Zarif ve modern etekler - mini, midi, maxi',
        image: 'https://images.unsplash.com/photo-1594633312682-0cc6c3d73a2a?w=400&h=400&fit=crop',
      },
      {
        name: 'Ceket & Blazer',
        slug: 'ceket-blazer',
        description: 'Şık ceket ve blazerler - iş ve günlük kullanım',
        image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&h=400&fit=crop',
      },
      {
        name: 'Kaban & Mont',
        slug: 'kaban-mont',
        description: 'Kışlık kaban ve montlar - sıcak tutan, şık',
        image: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=400&h=400&fit=crop',
      },
      {
        name: 'Kazak & Hırka',
        slug: 'kazak-hirka',
        description: 'Sıcak tutan kazaklar ve hırkalar',
        image: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&h=400&fit=crop',
      },
      {
        name: 'T-Shirt & Tişört',
        slug: 'tshirt-tisort',
        description: 'Rahat ve şık t-shirt ve tişörtler',
        image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop',
      },
      {
        name: 'Ayakkabı',
        slug: 'ayakkabi',
        description: 'Bot, topuklu, spor ve günlük ayakkabılar',
        image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop',
      },
      {
        name: 'Çanta',
        slug: 'canta',
        description: 'Günlük, el çantaları, sırt çantaları',
        image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400&h=400&fit=crop',
      },
      {
        name: 'Aksesuar',
        slug: 'aksesuar',
        description: 'Kemer, şapka, atkı, eldiven ve diğer aksesuarlar',
        image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop',
      },
      {
        name: 'İç Giyim',
        slug: 'ic-giyim',
        description: 'Rahat ve kaliteli iç giyim ürünleri',
        image: 'https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=400&h=400&fit=crop',
      },
    ]);

    console.log('Kategoriler oluşturuldu');

    // Ürünleri temizle ve oluştur
    await Product.deleteMany({});

    const products = [
      // ELBİSE KATEGORİSİ
      {
        name: 'Klasik Siyah Midi Elbise',
        slug: 'klasik-siyah-midi-elbise',
        description: 'Her gardırobun vazgeçilmezi, şık ve rahat siyah midi elbise. Özel günlerinizde veya günlük kullanımda tercih edebilirsiniz. Vücuda oturan kesimi ile zarif bir görünüm sunar.',
        price: 599.90,
        comparePrice: 799.90,
        images: [
          'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&h=800&fit=crop',
          'https://images.unsplash.com/photo-1566479179817-4d3e0e0e8e8e?w=800&h=800&fit=crop',
          'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&h=800&fit=crop',
        ],
        category: categories[0]._id,
        sizes: ['XS', 'S', 'M', 'L', 'XL'],
        colors: ['Siyah', 'Kırmızı', 'Lacivert', 'Bordo'],
        stock: 15,
        featured: true,
        status: 'active',
      },
      {
        name: 'Çiçekli Yaz Elbisesi',
        slug: 'cicekli-yaz-elbisesi',
        description: 'Yaz aylarının vazgeçilmezi, neşeli çiçek desenli elbise. Rahat kesimi ile günlük kullanım için ideal. Hafif kumaşı sayesinde sıcak günlerde rahatlıkla giyebilirsiniz.',
        price: 449.90,
        comparePrice: 599.90,
        images: [
          'https://images.unsplash.com/photo-1594633312682-0cc6c3d73a2a?w=800&h=800&fit=crop',
          'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&h=800&fit=crop',
        ],
        category: categories[0]._id,
        sizes: ['S', 'M', 'L', 'XL'],
        colors: ['Beyaz', 'Pembe', 'Mavi', 'Sarı'],
        stock: 20,
        featured: true,
        status: 'active',
      },
      {
        name: 'Gece Elbisesi - Sequin',
        slug: 'gece-elbisesi-sequin',
        description: 'Özel geceler için şık sequin detaylı gece elbisesi. Göz alıcı tasarımı ile dikkat çekici bir görünüm sunar.',
        price: 1299.90,
        comparePrice: 1699.90,
        images: [
          'https://images.unsplash.com/photo-1566479179817-4d3e0e0e8e8e?w=800&h=800&fit=crop',
          'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&h=800&fit=crop',
        ],
        category: categories[0]._id,
        sizes: ['XS', 'S', 'M', 'L'],
        colors: ['Siyah', 'Altın', 'Gümüş', 'Kırmızı'],
        stock: 8,
        featured: true,
        status: 'active',
      },
      {
        name: 'Günlük Pamuk Elbise',
        slug: 'gunluk-pamuk-elbise',
        description: 'Rahat ve şık günlük pamuk elbise. Günlük kullanım için ideal, nefes alan kumaşı ile konforlu.',
        price: 349.90,
        comparePrice: 449.90,
        images: [
          'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&h=800&fit=crop',
          'https://images.unsplash.com/photo-1594633312682-0cc6c3d73a2a?w=800&h=800&fit=crop',
        ],
        category: categories[0]._id,
        sizes: ['XS', 'S', 'M', 'L', 'XL'],
        colors: ['Beyaz', 'Siyah', 'Krem', 'Mavi'],
        stock: 25,
        featured: false,
        status: 'active',
      },
      {
        name: 'Ofis Elbisesi - Klasik',
        slug: 'ofis-elbisesi-klasik',
        description: 'İş hayatı için ideal, profesyonel görünümlü klasik elbise. Zarif ve şık tasarımı ile ofis ortamında rahatlıkla giyebilirsiniz.',
        price: 699.90,
        comparePrice: 899.90,
        images: [
          'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&h=800&fit=crop',
          'https://images.unsplash.com/photo-1566479179817-4d3e0e0e8e8e?w=800&h=800&fit=crop',
        ],
        category: categories[0]._id,
        sizes: ['XS', 'S', 'M', 'L', 'XL'],
        colors: ['Siyah', 'Lacivert', 'Krem', 'Bordo'],
        stock: 18,
        featured: true,
        status: 'active',
      },
      {
        name: 'Yazlık Çiçekli Elbise',
        slug: 'yazlik-cicekli-elbise',
        description: 'Hafif ve neşeli yazlık elbise. Rahat kesimi ve canlı renkleri ile yaz aylarının favorisi.',
        price: 379.90,
        comparePrice: 499.90,
        images: [
          'https://images.unsplash.com/photo-1594633312682-0cc6c3d73a2a?w=800&h=800&fit=crop',
          'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&h=800&fit=crop',
        ],
        category: categories[0]._id,
        sizes: ['S', 'M', 'L', 'XL'],
        colors: ['Sarı', 'Turuncu', 'Pembe', 'Mavi'],
        stock: 22,
        featured: false,
        status: 'active',
      },
      {
        name: 'Mini Elbise - Parti',
        slug: 'mini-elbise-parti',
        description: 'Parti ve özel geceler için şık mini elbise. Genç ve dinamik görünüm sunar.',
        price: 549.90,
        comparePrice: 699.90,
        images: [
          'https://images.unsplash.com/photo-1566479179817-4d3e0e0e8e8e?w=800&h=800&fit=crop',
          'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&h=800&fit=crop',
        ],
        category: categories[0]._id,
        sizes: ['XS', 'S', 'M', 'L'],
        colors: ['Siyah', 'Kırmızı', 'Pembe', 'Lacivert'],
        stock: 12,
        featured: false,
        status: 'active',
      },

      // GÖMLEK & BLUZ KATEGORİSİ
      {
        name: 'Beyaz Klasik Gömlek',
        slug: 'beyaz-klasik-gomlek',
        description: 'Zarif ve şık beyaz gömlek. İş hayatından özel günlere kadar her yerde kullanabileceğiniz klasik parça.',
        price: 299.90,
        comparePrice: 399.90,
        images: [
          'https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=800&h=800&fit=crop',
          'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&h=800&fit=crop',
        ],
        category: categories[1]._id,
        sizes: ['XS', 'S', 'M', 'L', 'XL'],
        colors: ['Beyaz', 'Açık Mavi', 'Krem'],
        stock: 25,
        featured: true,
        status: 'active',
      },
      {
        name: 'İş Gömleği - Uzun Kollu',
        slug: 'is-gomlegi-uzun-kollu',
        description: 'Profesyonel görünüm için ideal iş gömleği. Uzun kollu tasarımı ile tüm mevsimlerde kullanılabilir.',
        price: 349.90,
        comparePrice: 449.90,
        images: [
          'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&h=800&fit=crop',
          'https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=800&h=800&fit=crop',
        ],
        category: categories[1]._id,
        sizes: ['XS', 'S', 'M', 'L', 'XL'],
        colors: ['Beyaz', 'Açık Mavi', 'Pembe', 'Krem'],
        stock: 20,
        featured: true,
        status: 'active',
      },
      {
        name: 'Kısa Kollu Bluz',
        slug: 'kisa-kollu-bluz',
        description: 'Yaz ayları için ideal, rahat ve şık kısa kollu bluz. Günlük kullanım için mükemmel.',
        price: 249.90,
        comparePrice: 329.90,
        images: [
          'https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=800&h=800&fit=crop',
          'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&h=800&fit=crop',
        ],
        category: categories[1]._id,
        sizes: ['XS', 'S', 'M', 'L', 'XL'],
        colors: ['Beyaz', 'Siyah', 'Mavi', 'Pembe', 'Sarı'],
        stock: 30,
        featured: false,
        status: 'active',
      },
      {
        name: 'Dantel Detaylı Bluz',
        slug: 'dantel-detayli-bluz',
        description: 'Zarif dantel detaylı bluz. Özel günler için şık bir seçim.',
        price: 399.90,
        comparePrice: 499.90,
        images: [
          'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&h=800&fit=crop',
          'https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=800&h=800&fit=crop',
        ],
        category: categories[1]._id,
        sizes: ['XS', 'S', 'M', 'L'],
        colors: ['Beyaz', 'Krem', 'Siyah'],
        stock: 15,
        featured: false,
        status: 'active',
      },

      // PANTOLON KATEGORİSİ
      {
        name: 'Siyah Dar Kesim Pantolon',
        slug: 'siyah-dar-kesim-pantolon',
        description: 'Modern ve şık siyah dar kesim pantolon. Her kombinasyonla uyumlu, rahat ve zarif.',
        price: 399.90,
        comparePrice: 549.90,
        images: [
          'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&h=800&fit=crop',
          'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=800&h=800&fit=crop',
        ],
        category: categories[2]._id,
        sizes: ['XS', 'S', 'M', 'L', 'XL'],
        colors: ['Siyah', 'Lacivert', 'Koyu Gri'],
        stock: 18,
        featured: true,
        status: 'active',
      },
      {
        name: 'Klasik Kesim Pantolon',
        slug: 'klasik-kesim-pantolon',
        description: 'Rahat ve şık klasik kesim pantolon. İş hayatı için ideal, profesyonel görünüm sunar.',
        price: 449.90,
        comparePrice: 599.90,
        images: [
          'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=800&h=800&fit=crop',
          'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&h=800&fit=crop',
        ],
        category: categories[2]._id,
        sizes: ['XS', 'S', 'M', 'L', 'XL'],
        colors: ['Siyah', 'Lacivert', 'Krem', 'Gri'],
        stock: 22,
        featured: true,
        status: 'active',
      },
      {
        name: 'Geniş Kesim Pantolon',
        slug: 'genis-kesim-pantolon',
        description: 'Rahat ve şık geniş kesim pantolon. Günlük kullanım için ideal, rahat kesimi ile konforlu.',
        price: 429.90,
        comparePrice: 579.90,
        images: [
          'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&h=800&fit=crop',
          'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=800&h=800&fit=crop',
        ],
        category: categories[2]._id,
        sizes: ['XS', 'S', 'M', 'L', 'XL'],
        colors: ['Siyah', 'Lacivert', 'Krem', 'Beyaz'],
        stock: 16,
        featured: false,
        status: 'active',
      },
      {
        name: 'Yüksek Bel Pantolon',
        slug: 'yuksek-bel-pantolon',
        description: 'Şık ve modern yüksek bel pantolon. Vücut hatlarını güzel gösteren kesimi ile zarif bir görünüm.',
        price: 479.90,
        comparePrice: 629.90,
        images: [
          'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=800&h=800&fit=crop',
          'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&h=800&fit=crop',
        ],
        category: categories[2]._id,
        sizes: ['XS', 'S', 'M', 'L'],
        colors: ['Siyah', 'Lacivert', 'Krem'],
        stock: 14,
        featured: false,
        status: 'active',
      },

      // ETEK KATEGORİSİ
      {
        name: 'Midi Etek - Klasik',
        slug: 'midi-etek-klasik',
        description: 'Zarif ve modern midi etek. İş hayatından sosyal etkinliklere kadar geniş kullanım alanı.',
        price: 349.90,
        comparePrice: 449.90,
        images: [
          'https://images.unsplash.com/photo-1594633312682-0cc6c3d73a2a?w=800&h=800&fit=crop',
          'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&h=800&fit=crop',
        ],
        category: categories[3]._id,
        sizes: ['XS', 'S', 'M', 'L', 'XL'],
        colors: ['Siyah', 'Krem', 'Bordo', 'Lacivert'],
        stock: 12,
        featured: true,
        status: 'active',
      },
      {
        name: 'Mini Etek - Genç',
        slug: 'mini-etek-genc',
        description: 'Genç ve dinamik görünüm için mini etek. Günlük kullanım için ideal.',
        price: 279.90,
        comparePrice: 379.90,
        images: [
          'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&h=800&fit=crop',
          'https://images.unsplash.com/photo-1594633312682-0cc6c3d73a2a?w=800&h=800&fit=crop',
        ],
        category: categories[3]._id,
        sizes: ['XS', 'S', 'M', 'L'],
        colors: ['Siyah', 'Kırmızı', 'Mavi', 'Pembe'],
        stock: 18,
        featured: false,
        status: 'active',
      },
      {
        name: 'Maksimum Etek',
        slug: 'maksimum-etek',
        description: 'Zarif ve şık maksimum etek. Özel günler için ideal, uzun kesimi ile zarif bir görünüm.',
        price: 429.90,
        comparePrice: 549.90,
        images: [
          'https://images.unsplash.com/photo-1594633312682-0cc6c3d73a2a?w=800&h=800&fit=crop',
          'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&h=800&fit=crop',
        ],
        category: categories[3]._id,
        sizes: ['S', 'M', 'L', 'XL'],
        colors: ['Siyah', 'Krem', 'Bordo', 'Lacivert'],
        stock: 10,
        featured: false,
        status: 'active',
      },

      // CEKET & BLAZER KATEGORİSİ
      {
        name: 'Klasik Blazer',
        slug: 'klasik-blazer',
        description: 'Şık ve profesyonel görünüm için klasik blazer. Her gardırobun olmazsa olmazı.',
        price: 799.90,
        comparePrice: 999.90,
        images: [
          'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&h=800&fit=crop',
          'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=800&h=800&fit=crop',
        ],
        category: categories[4]._id,
        sizes: ['XS', 'S', 'M', 'L', 'XL'],
        colors: ['Siyah', 'Lacivert', 'Krem', 'Gri'],
        stock: 10,
        featured: true,
        status: 'active',
      },
      {
        name: 'Deri Ceket',
        slug: 'deri-ceket',
        description: 'Şık ve dayanıklı deri ceket. Günlük kullanım için ideal, modern tasarımı ile dikkat çekici.',
        price: 1299.90,
        comparePrice: 1699.90,
        images: [
          'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=800&h=800&fit=crop',
          'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&h=800&fit=crop',
        ],
        category: categories[4]._id,
        sizes: ['XS', 'S', 'M', 'L'],
        colors: ['Siyah', 'Kahverengi', 'Bordo'],
        stock: 8,
        featured: true,
        status: 'active',
      },
      {
        name: 'Trençkot',
        slug: 'trenckot',
        description: 'Klasik ve şık trençkot. Yağmurlu günler için ideal, zarif tasarımı ile her mevsim kullanılabilir.',
        price: 899.90,
        comparePrice: 1199.90,
        images: [
          'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&h=800&fit=crop',
          'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=800&h=800&fit=crop',
        ],
        category: categories[4]._id,
        sizes: ['XS', 'S', 'M', 'L', 'XL'],
        colors: ['Bej', 'Krem', 'Siyah'],
        stock: 12,
        featured: false,
        status: 'active',
      },

      // KABAN & MONT KATEGORİSİ
      {
        name: 'Kışlık Kaban',
        slug: 'kislik-kaban',
        description: 'Sıcak tutan ve şık kışlık kaban. Soğuk günlerde rahatlıkla kullanabilirsiniz.',
        price: 1499.90,
        comparePrice: 1999.90,
        images: [
          'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=800&h=800&fit=crop',
          'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&h=800&fit=crop',
        ],
        category: categories[5]._id,
        sizes: ['XS', 'S', 'M', 'L', 'XL'],
        colors: ['Siyah', 'Lacivert', 'Krem', 'Bordo'],
        stock: 10,
        featured: true,
        status: 'active',
      },
      {
        name: 'Yün Mont',
        slug: 'yun-mont',
        description: 'Sıcak tutan yün mont. Kış ayları için ideal, rahat ve şık.',
        price: 1199.90,
        comparePrice: 1599.90,
        images: [
          'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=800&h=800&fit=crop',
          'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&h=800&fit=crop',
        ],
        category: categories[5]._id,
        sizes: ['XS', 'S', 'M', 'L', 'XL'],
        colors: ['Siyah', 'Gri', 'Krem', 'Bordo'],
        stock: 12,
        featured: false,
        status: 'active',
      },

      // KAZAK & HIRKA KATEGORİSİ
      {
        name: 'Yün Kazak',
        slug: 'yun-kazak',
        description: 'Sıcak tutan ve rahat yün kazak. Kış ayları için ideal, şık tasarımı ile her kombinasyonla uyumlu.',
        price: 399.90,
        comparePrice: 549.90,
        images: [
          'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&h=800&fit=crop',
          'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&h=800&fit=crop',
        ],
        category: categories[6]._id,
        sizes: ['XS', 'S', 'M', 'L', 'XL'],
        colors: ['Siyah', 'Gri', 'Krem', 'Bordo', 'Lacivert'],
        stock: 20,
        featured: true,
        status: 'active',
      },
      {
        name: 'Hırka - Örgü',
        slug: 'hirka-orgu',
        description: 'Rahat ve şık örgü hırka. Günlük kullanım için ideal, rahat kesimi ile konforlu.',
        price: 349.90,
        comparePrice: 449.90,
        images: [
          'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&h=800&fit=crop',
        ],
        category: categories[6]._id,
        sizes: ['XS', 'S', 'M', 'L', 'XL'],
        colors: ['Siyah', 'Gri', 'Krem', 'Mavi', 'Pembe'],
        stock: 18,
        featured: false,
        status: 'active',
      },
      {
        name: 'Kazak - V Yaka',
        slug: 'kazak-v-yaka',
        description: 'Şık ve modern V yaka kazak. Günlük kullanım için ideal, zarif tasarımı ile dikkat çekici.',
        price: 279.90,
        comparePrice: 379.90,
        images: [
          'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&h=800&fit=crop',
        ],
        category: categories[6]._id,
        sizes: ['XS', 'S', 'M', 'L', 'XL'],
        colors: ['Siyah', 'Beyaz', 'Gri', 'Mavi', 'Pembe'],
        stock: 25,
        featured: false,
        status: 'active',
      },

      // T-SHIRT & TİŞÖRT KATEGORİSİ
      {
        name: 'Klasik T-Shirt',
        slug: 'klasik-tshirt',
        description: 'Rahat ve şık klasik t-shirt. Günlük kullanım için ideal, nefes alan kumaşı ile konforlu.',
        price: 149.90,
        comparePrice: 199.90,
        images: [
          'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&h=800&fit=crop',
          'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&h=800&fit=crop',
        ],
        category: categories[7]._id,
        sizes: ['XS', 'S', 'M', 'L', 'XL'],
        colors: ['Beyaz', 'Siyah', 'Gri', 'Mavi', 'Pembe', 'Sarı'],
        stock: 40,
        featured: true,
        status: 'active',
      },
      {
        name: 'Uzun Kollu Tişört',
        slug: 'uzun-kollu-tisort',
        description: 'Rahat ve şık uzun kollu tişört. Tüm mevsimlerde kullanılabilir, nefes alan kumaşı ile konforlu.',
        price: 199.90,
        comparePrice: 279.90,
        images: [
          'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&h=800&fit=crop',
        ],
        category: categories[7]._id,
        sizes: ['XS', 'S', 'M', 'L', 'XL'],
        colors: ['Beyaz', 'Siyah', 'Gri', 'Mavi', 'Krem'],
        stock: 35,
        featured: false,
        status: 'active',
      },

      // AYAKKABI KATEGORİSİ
      {
        name: 'Topuklu Ayakkabı - Klasik',
        slug: 'topuklu-ayakkabi-klasik',
        description: 'Şık ve zarif klasik topuklu ayakkabı. Özel günler için ideal, rahat topuk yüksekliği ile konforlu.',
        price: 599.90,
        comparePrice: 799.90,
        images: [
          'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=800&fit=crop',
          'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800&h=800&fit=crop',
        ],
        category: categories[8]._id,
        sizes: ['36', '37', '38', '39', '40', '41'],
        colors: ['Siyah', 'Krem', 'Kırmızı', 'Lacivert'],
        stock: 15,
        featured: true,
        status: 'active',
      },
      {
        name: 'Spor Ayakkabı',
        slug: 'spor-ayakkabi',
        description: 'Rahat ve şık spor ayakkabı. Günlük kullanım için ideal, rahat tabanı ile konforlu.',
        price: 699.90,
        comparePrice: 899.90,
        images: [
          'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800&h=800&fit=crop',
          'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=800&fit=crop',
        ],
        category: categories[8]._id,
        sizes: ['36', '37', '38', '39', '40', '41'],
        colors: ['Beyaz', 'Siyah', 'Gri', 'Pembe', 'Mavi'],
        stock: 20,
        featured: true,
        status: 'active',
      },
      {
        name: 'Bot - Kışlık',
        slug: 'bot-kislik',
        description: 'Sıcak tutan ve şık kışlık bot. Soğuk günlerde rahatlıkla kullanabilirsiniz.',
        price: 799.90,
        comparePrice: 1099.90,
        images: [
          'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=800&fit=crop',
          'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800&h=800&fit=crop',
        ],
        category: categories[8]._id,
        sizes: ['36', '37', '38', '39', '40', '41'],
        colors: ['Siyah', 'Kahverengi', 'Bordo', 'Krem'],
        stock: 12,
        featured: false,
        status: 'active',
      },
      {
        name: 'Babet - Günlük',
        slug: 'babet-gunluk',
        description: 'Rahat ve şık babet. Günlük kullanım için ideal, rahat tabanı ile konforlu.',
        price: 349.90,
        comparePrice: 449.90,
        images: [
          'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800&h=800&fit=crop',
          'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=800&fit=crop',
        ],
        category: categories[8]._id,
        sizes: ['36', '37', '38', '39', '40', '41'],
        colors: ['Siyah', 'Krem', 'Beyaz', 'Kırmızı'],
        stock: 18,
        featured: false,
        status: 'active',
      },

      // ÇANTA KATEGORİSİ
      {
        name: 'Deri Çanta - Klasik',
        slug: 'deri-canta-klasik',
        description: 'Şık ve dayanıklı deri çanta. Günlük kullanım için ideal, geniş iç hacmi ile pratik.',
        price: 599.90,
        comparePrice: 799.90,
        images: [
          'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&h=800&fit=crop',
          'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&h=800&fit=crop',
        ],
        category: categories[9]._id,
        sizes: ['Tek Ebat'],
        colors: ['Kahverengi', 'Siyah', 'Krem', 'Bordo'],
        stock: 8,
        featured: true,
        status: 'active',
      },
      {
        name: 'El Çantası - Şık',
        slug: 'el-cantasi-sik',
        description: 'Zarif ve şık el çantası. Özel günler için ideal, kompakt tasarımı ile pratik.',
        price: 449.90,
        comparePrice: 599.90,
        images: [
          'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&h=800&fit=crop',
          'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&h=800&fit=crop',
        ],
        category: categories[9]._id,
        sizes: ['Tek Ebat'],
        colors: ['Siyah', 'Krem', 'Kırmızı', 'Lacivert'],
        stock: 12,
        featured: true,
        status: 'active',
      },
      {
        name: 'Sırt Çantası',
        slug: 'sirt-cantasi',
        description: 'Rahat ve şık sırt çantası. Günlük kullanım için ideal, geniş iç hacmi ile pratik.',
        price: 399.90,
        comparePrice: 549.90,
        images: [
          'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&h=800&fit=crop',
          'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&h=800&fit=crop',
        ],
        category: categories[9]._id,
        sizes: ['Tek Ebat'],
        colors: ['Siyah', 'Gri', 'Mavi', 'Pembe'],
        stock: 15,
        featured: false,
        status: 'active',
      },

      // AKSESUAR KATEGORİSİ
      {
        name: 'Deri Kemer',
        slug: 'deri-kemer',
        description: 'Şık ve dayanıklı deri kemer. Her kombinasyonla uyumlu, zarif tasarımı ile dikkat çekici.',
        price: 199.90,
        comparePrice: 299.90,
        images: [
          'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&h=800&fit=crop',
        ],
        category: categories[10]._id,
        sizes: ['S', 'M', 'L', 'XL'],
        colors: ['Siyah', 'Kahverengi', 'Krem'],
        stock: 20,
        featured: true,
        status: 'active',
      },
      {
        name: 'Şapka - Klasik',
        slug: 'sapka-klasik',
        description: 'Şık ve zarif klasik şapka. Güneşten korunmak için ideal, zarif tasarımı ile dikkat çekici.',
        price: 149.90,
        comparePrice: 199.90,
        images: [
          'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&h=800&fit=crop',
        ],
        category: categories[10]._id,
        sizes: ['Tek Ebat'],
        colors: ['Siyah', 'Krem', 'Bej', 'Beyaz'],
        stock: 25,
        featured: false,
        status: 'active',
      },
      {
        name: 'Atkı - Yün',
        slug: 'atki-yun',
        description: 'Sıcak tutan ve şık yün atkı. Kış ayları için ideal, zarif tasarımı ile her kombinasyonla uyumlu.',
        price: 129.90,
        comparePrice: 179.90,
        images: [
          'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&h=800&fit=crop',
        ],
        category: categories[10]._id,
        sizes: ['Tek Ebat'],
        colors: ['Siyah', 'Gri', 'Krem', 'Bordo', 'Lacivert'],
        stock: 30,
        featured: false,
        status: 'active',
      },
      {
        name: 'Eldiven - Deri',
        slug: 'eldiven-deri',
        description: 'Sıcak tutan ve şık deri eldiven. Kış ayları için ideal, rahat kesimi ile konforlu.',
        price: 179.90,
        comparePrice: 249.90,
        images: [
          'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&h=800&fit=crop',
        ],
        category: categories[10]._id,
        sizes: ['S', 'M', 'L'],
        colors: ['Siyah', 'Kahverengi', 'Krem', 'Bordo'],
        stock: 18,
        featured: false,
        status: 'active',
      },

      // İÇ GİYİM KATEGORİSİ
      {
        name: 'Pamuk İç Giyim Seti',
        slug: 'pamuk-ic-giyim-seti',
        description: 'Rahat ve kaliteli pamuk iç giyim seti. Günlük kullanım için ideal, nefes alan kumaşı ile konforlu.',
        price: 249.90,
        comparePrice: 349.90,
        images: [
          'https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=800&h=800&fit=crop',
        ],
        category: categories[11]._id,
        sizes: ['XS', 'S', 'M', 'L', 'XL'],
        colors: ['Beyaz', 'Siyah', 'Krem', 'Pembe'],
        stock: 30,
        featured: true,
        status: 'active',
      },
      {
        name: 'Dantel İç Giyim Seti',
        slug: 'dantel-ic-giyim-seti',
        description: 'Zarif ve şık dantel iç giyim seti. Özel günler için ideal, zarif tasarımı ile dikkat çekici.',
        price: 349.90,
        comparePrice: 449.90,
        images: [
          'https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=800&h=800&fit=crop',
        ],
        category: categories[11]._id,
        sizes: ['XS', 'S', 'M', 'L'],
        colors: ['Beyaz', 'Siyah', 'Krem', 'Pembe'],
        stock: 20,
        featured: false,
        status: 'active',
      },
    ];

    await Product.insertMany(products);
    console.log('Ürünler oluşturuldu');

    console.log('\n✅ Seed işlemi tamamlandı!');
    console.log('\nAdmin Kullanıcı:');
    console.log('  Email: admin@dipolbutik.com');
    console.log('  Şifre: admin123');
    console.log('\nTest Kullanıcı:');
    console.log('  Email: test@dipolbutik.com');
    console.log('  Şifre: admin123');
    console.log(`\n${categories.length} kategori ve ${products.length} ürün oluşturuldu.`);

    process.exit(0);
  } catch (error) {
    console.error('Seed hatası:', error);
    process.exit(1);
  }
}

seed();
