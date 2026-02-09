
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load env
const envLocalPath = resolve(process.cwd(), '.env.local');
dotenv.config({ path: envLocalPath });

const MONGODB_URI = process.env.database_url || process.env.DATABASE_URL || process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('Error: DATABASE_URL not found in .env.local');
    process.exit(1);
}

// Schemas (simplified for reading names)
const CategorySchema = new mongoose.Schema({ name: String }, { strict: false });
const ProductSchema = new mongoose.Schema({ name: String, category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' } }, { strict: false });

const Category = mongoose.model('Category', CategorySchema);
const Product = mongoose.model('Product', ProductSchema);

async function run() {
    try {
        console.log('Connecting to DB...', MONGODB_URI.substring(0, 20) + '...');
        await mongoose.connect(MONGODB_URI, { dbName: 'dipol-butik' });
        console.log('Connected.');

        const categories = await Category.find({}).lean();
        console.log(`\n--- Categories (${categories.length}) ---`);
        categories.forEach(c => console.log(`- ${c.name} (ID: ${c._id})`));

        const products = await Product.find({}).populate('category').lean();
        console.log(`\n--- Products (${products.length}) ---`);
        products.forEach(p => console.log(`- ${p.name} (Category: ${p.category ? p.category.name : 'None'})`));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

run();
