import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const pool = new Pool({
  host: process.env.DATABASE_HOST || 'postgres',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  database: process.env.DATABASE_NAME || 'example_db',
  user: process.env.DATABASE_USERNAME || 'example',
  password: process.env.DATABASE_PASSWORD || 'example_pwd',
});

function genDocId() { return crypto.randomBytes(12).toString('hex').slice(0, 24); }

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id SERIAL PRIMARY KEY,
      document_id VARCHAR(255) UNIQUE,
      first_name VARCHAR(255),
      last_name VARCHAR(255),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'editor',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP(6),
      updated_at TIMESTAMP(6)
    )
  `);
  // Add role column if missing (legacy table)
  try { await pool.query('ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS role VARCHAR(50) NOT NULL DEFAULT \'editor\''); } catch { }
}

async function createSuperAdmin() {
  const email = process.env.SA_EMAIL || 'admin@example.com';
  const password = process.env.SA_PASSWORD || 'admin123456';
  const firstName = process.env.SA_FIRST || 'Admin User';
  const lastName = process.env.SA_LAST || 'Example';

  console.log('🔐 Example SuperAdmin Oluşturucu');
  console.log('-----------------------------------');

  await ensureTable();

  // Check if superadmin already exists
  const existing = await pool.query("SELECT id, email FROM admin_users WHERE role = 'superadmin'");
  if (existing.rows.length > 0) {
    console.log(`❌ Sistemde zaten bir SuperAdmin mevcut: ${existing.rows[0].email}`);
    console.log('   Tek SuperAdmin kuralı gereği yeni bir SuperAdmin oluşturulamaz.');
    process.exit(1);
  }

  // Check if email already used by another role
  const emailCheck = await pool.query('SELECT id FROM admin_users WHERE email = $1', [email]);
  if (emailCheck.rows.length > 0) {
    console.log(`❌ Bu e-posta adresi (${email}) zaten başka bir kullanıcıya ait.`);
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 10);
  const docId = genDocId();

  await pool.query(
    `INSERT INTO admin_users (document_id, first_name, last_name, email, password_hash, role, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, 'superadmin', true, $6, $6)`,
    [docId, firstName, lastName, email, hash, new Date().toISOString()]
  );

  console.log('✅ SuperAdmin başarıyla oluşturuldu!');
  console.log(`   Email: ${email}`);
  console.log(`   Şifre: ${password}`);
  console.log(`   Rol:   superadmin`);
  console.log('');
  console.log('⚠️  Lütfen bu bilgileri güvenli bir yerde saklayın.');
  process.exit(0);
}

createSuperAdmin().catch(err => {
  console.error('❌ SuperAdmin oluşturulurken hata:', err.message);
  process.exit(1);
});
