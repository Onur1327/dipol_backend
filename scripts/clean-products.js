import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import connectDB from '../lib/mongodb.js';
import Product from '../models/Product.js';

async function cleanProducts() {
    try {
        await connectDB();
        console.log('MongoDB bağlantısı başarılı');

        console.log('Tüm ürünler siliniyor...');
        const result = await Product.deleteMany({});

        console.log(`İşlem tamamlandı. ${result.deletedCount} adet ürün silindi.`);
        process.exit(0);
    } catch (error) {
        console.error('Hata:', error);
        process.exit(1);
    }
}

cleanProducts();
