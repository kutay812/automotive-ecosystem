import { Pool } from 'pg';

export const pool = new Pool({
  host: process.env.DATABASE_HOST || 'postgres',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  database: process.env.DATABASE_NAME || 'example_db',
  user: process.env.DATABASE_USERNAME || 'example',
  password: process.env.DATABASE_PASSWORD || 'example_pwd',
  max: 20, // en fazla 20 eşzamanlı bağlantı
  idleTimeoutMillis: 30000, // 30 saniye boşta kalan bağlantıyı kapat
  connectionTimeoutMillis: 5000, // 5 saniyede bağlanamazsa hata fırlat
});
