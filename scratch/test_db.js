import connectDB from '../lib/mongodb.js';

async function test() {
  try {
    console.log('Veritabanına bağlanılıyor...');
    const conn = await connectDB();
    console.log('Bağlantı başarılı!');
    console.log('Host:', conn.connection.host);
    console.log('Database Name:', conn.connection.db.databaseName);
    process.exit(0);
  } catch (error) {
    console.error('Bağlantı hatası:', error);
    process.exit(1);
  }
}

test();
