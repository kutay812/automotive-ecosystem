import { pool } from './db';

// Temel tabloları ve varsayılan rolleri oluştur
export async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS up_roles (
      id SERIAL PRIMARY KEY,
      document_id VARCHAR(255) UNIQUE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      type VARCHAR(50) UNIQUE,
      created_at TIMESTAMP(6),
      updated_at TIMESTAMP(6),
      published_at TIMESTAMP(6)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS up_users (
      id SERIAL PRIMARY KEY,
      document_id VARCHAR(255) UNIQUE,
      username VARCHAR(255) UNIQUE,
      email VARCHAR(255) UNIQUE,
      password VARCHAR(255),
      first_name VARCHAR(255),
      last_name VARCHAR(255),
      provider VARCHAR(50),
      confirmed BOOLEAN DEFAULT true,
      blocked BOOLEAN DEFAULT false,
      created_at TIMESTAMP(6),
      updated_at TIMESTAMP(6),
      published_at TIMESTAMP(6)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS up_users_role_lnk (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES up_users(id) ON DELETE CASCADE,
      role_id INTEGER REFERENCES up_roles(id) ON DELETE CASCADE,
      UNIQUE(user_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS up_permissions (
      id SERIAL PRIMARY KEY,
      document_id VARCHAR(255) UNIQUE,
      action VARCHAR(255) UNIQUE,
      created_at TIMESTAMP(6),
      updated_at TIMESTAMP(6)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS up_permissions_role_lnk (
      id SERIAL PRIMARY KEY,
      permission_id INTEGER REFERENCES up_permissions(id) ON DELETE CASCADE,
      role_id INTEGER REFERENCES up_roles(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS files (
      id SERIAL PRIMARY KEY,
      document_id VARCHAR(255) UNIQUE,
      name VARCHAR(255),
      alternative_text TEXT,
      caption TEXT,
      width INTEGER,
      height INTEGER,
      ext VARCHAR(50),
      mime VARCHAR(100),
      size VARCHAR(50),
      url TEXT,
      preview_url TEXT,
      provider VARCHAR(50),
      hash VARCHAR(255),
      created_at TIMESTAMP(6),
      updated_at TIMESTAMP(6)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS files_related_mph (
      id SERIAL PRIMARY KEY,
      file_id INTEGER REFERENCES files(id) ON DELETE CASCADE,
      related_id INTEGER,
      related_type VARCHAR(255),
      field VARCHAR(255)
    )
  `);

  // Role Seeding
  const authenticatedRole = await pool.query("SELECT id FROM up_roles WHERE type = 'authenticated'");
  if (authenticatedRole.rows.length === 0) {
    await pool.query(
      "INSERT INTO up_roles (document_id, name, description, type, created_at, updated_at, published_at) VALUES ($1, $2, $3, $4, $5, $5, $5)",
      ['auth_role_doc_id', 'Authenticated', 'Default role for registered users', 'authenticated', new Date().toISOString()]
    );
  }

  const publicRole = await pool.query("SELECT id FROM up_roles WHERE type = 'public'");
  if (publicRole.rows.length === 0) {
    await pool.query(
      "INSERT INTO up_roles (document_id, name, description, type, created_at, updated_at, published_at) VALUES ($1, $2, $3, $4, $5, $5, $5)",
      ['public_role_doc_id', 'Public', 'Default role for non-authenticated users', 'public', new Date().toISOString()]
    );
  }

  // Homepage (Production) Media
  await pool.query(`
    CREATE TABLE IF NOT EXISTS homepage_media (
      id SERIAL PRIMARY KEY,
      document_id VARCHAR(255) UNIQUE,
      title VARCHAR(255),
      description TEXT,
      media_type VARCHAR(50) NOT NULL DEFAULT 'youtube',
      media_url TEXT NOT NULL,
      thumbnail_url TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP(6),
      updated_at TIMESTAMP(6)
    )
  `);

  // Cars Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cars (
      id SERIAL PRIMARY KEY,
      document_id VARCHAR(255) UNIQUE,
      brand VARCHAR(255),
      model VARCHAR(255),
      year INTEGER,
      price_per_day NUMERIC,
      description TEXT,
      is_available BOOLEAN DEFAULT true,
      transmission VARCHAR(50),
      fuel_type VARCHAR(50),
      passenger_count INTEGER,
      luggage_count INTEGER,
      image_url TEXT,
      current_office_id TEXT,
      created_at TIMESTAMP(6),
      updated_at TIMESTAMP(6),
      published_at TIMESTAMP(6)
    )
  `);

  try {
    await pool.query('ALTER TABLE cars ADD COLUMN IF NOT EXISTS current_office_id TEXT');
  } catch (e) { }

  // Rental Tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rentals (
      id SERIAL PRIMARY KEY,
      document_id VARCHAR(255) UNIQUE,
      rental_status VARCHAR(50) DEFAULT 'bekliyor',
      pickup_office VARCHAR(255),
      dropoff_office VARCHAR(255),
      start_date TIMESTAMP(6),
      end_date TIMESTAMP(6),
      requested_end_date TIMESTAMP(6),
      created_at TIMESTAMP(6),
      updated_at TIMESTAMP(6),
      published_at TIMESTAMP(6)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS rentals_user_lnk (
      id SERIAL PRIMARY KEY,
      rental_id INTEGER REFERENCES rentals(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES up_users(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS rentals_car_lnk (
      id SERIAL PRIMARY KEY,
      rental_id INTEGER REFERENCES rentals(id) ON DELETE CASCADE,
      car_id INTEGER REFERENCES cars(id) ON DELETE CASCADE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS offices (
      id SERIAL PRIMARY KEY,
      document_id VARCHAR(255) UNIQUE,
      name VARCHAR(255) NOT NULL,
      city VARCHAR(255),
      address TEXT,
      phone VARCHAR(50),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP(6),
      updated_at TIMESTAMP(6),
      published_at TIMESTAMP(6)
    )
  `);

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
}

// Veritabanı başlatma ve tablo güncellemeleri
export async function initDatabase(retries = 5) {
  while (retries > 0) {
    try {
      console.log(`📡 Veritabanına bağlanılıyor... (Kalan deneme: ${retries})`);
      await pool.query('SELECT 1'); // Test query
      await ensureTables();

      // rentals tablosuna payment alanlarını ekle (varsa hata vermez)
      await pool.query(`
        ALTER TABLE rentals
        ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
        ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50),
        ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(100),
        ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50),
        ADD COLUMN IF NOT EXISTS original_end_date TIMESTAMP;
        
        UPDATE rentals SET original_end_date = end_date WHERE original_end_date IS NULL;
        
        UPDATE rentals SET approval_status = 'approved' WHERE rental_status IN ('aktif', 'bitti', 'iptal') AND approval_status IS NULL;
        UPDATE rentals SET approval_status = 'waiting_admin' WHERE rental_status NOT IN ('aktif', 'bitti', 'iptal') AND approval_status IS NULL;

        UPDATE admin_users SET role = 'editor' WHERE role = 'employee';

        ALTER TABLE up_users
        ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20),
        ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMP;
      `);
      console.log('✅ Veritabanı yapılandırması başarıyla güncellendi.');
      return;
    } catch (error: any) {
      console.error('⚠️ Veritabanı bağlantı hatası:', error.message);
      retries--;
      if (retries > 0) {
        console.log('🔄 3 saniye içinde tekrar denenecek...');
        await new Promise(res => setTimeout(res, 3000));
      } else {
        console.error('🔥 Veritabanına bağlanılamadı, uygulama durduruluyor.');
        process.exit(1);
      }
    }
  }
}

// ========== DB MIGRATIONS ==========
export async function runMigrations() {
  console.log('🔄 Veritabanı migration işlemleri başlıyor...');

  try {
    await pool.query('ALTER TABLE up_users ADD COLUMN IF NOT EXISTS google_id TEXT');
    console.log('✅ DB Migration: google_id sütunu hazır.');
  } catch (e: any) {
    console.error('⚠️ DB Migration hatası:', e.message);
  }

  // Offices tablosuna yeni alanlar
  try {
    await pool.query('ALTER TABLE offices ADD COLUMN IF NOT EXISTS location TEXT');
    await pool.query('ALTER TABLE offices ADD COLUMN IF NOT EXISTS opening_time VARCHAR(10)');
    await pool.query('ALTER TABLE offices ADD COLUMN IF NOT EXISTS closing_time VARCHAR(10)');
    console.log('✅ DB Migration: offices location/opening_time/closing_time sütunları hazır.');
  } catch (e: any) {
    console.error('⚠️ DB Migration (offices) hatası:', e.message);
  }

  // Rentals tablosuna ödeme türü alanı
  try {
    await pool.query('ALTER TABLE rentals ADD COLUMN IF NOT EXISTS payment_type VARCHAR(50)');
    console.log('✅ DB Migration: rentals payment_type sütunu hazır.');
  } catch (e: any) {
    console.error('⚠️ DB Migration (rentals payment_type) hatası:', e.message);
  }

  // E-Ticaret: shop_items tablosu
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shop_items (
        id SERIAL PRIMARY KEY,
        document_id VARCHAR(255) UNIQUE DEFAULT gen_random_uuid()::text,
        marketplace_id VARCHAR(255) DEFAULT '',
        title VARCHAR(500) NOT NULL,
        price DECIMAL(10,2) DEFAULT 0,
        image_url TEXT DEFAULT '',
        buy_link TEXT DEFAULT '',
        platform VARCHAR(50) NOT NULL DEFAULT 'trendyol',
        category VARCHAR(255) DEFAULT '',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query('ALTER TABLE shop_items ADD COLUMN IF NOT EXISTS sub_category VARCHAR(255) DEFAULT \'\'');
    await pool.query('ALTER TABLE shop_items ADD COLUMN IF NOT EXISTS vehicle_brand VARCHAR(255) DEFAULT \'\'');
    await pool.query('ALTER TABLE shop_items ADD COLUMN IF NOT EXISTS vehicle_model VARCHAR(255) DEFAULT \'\'');
    console.log('✅ DB Migration: shop_items tablosu hazır.');
  } catch (e: any) {
    console.error('⚠️ DB Migration (shop_items) hatası:', e.message);
  }

  // E-Ticaret: marketplace_settings tablosu
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS marketplace_settings (
        id SERIAL PRIMARY KEY,
        platform VARCHAR(50) UNIQUE NOT NULL,
        api_key TEXT DEFAULT '',
        api_secret TEXT DEFAULT '',
        seller_id VARCHAR(255) DEFAULT '',
        store_url TEXT DEFAULT '',
        is_enabled BOOLEAN DEFAULT false,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ DB Migration: marketplace_settings tablosu hazır.');
  } catch (e: any) {
    console.error('⚠️ DB Migration (marketplace_settings) hatası:', e.message);
  }

  // E-Ticaret: shop_orders tablosu (muhasebe entegrasyonu)
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shop_orders (
        id SERIAL PRIMARY KEY,
        shop_item_id INTEGER REFERENCES shop_items(id) ON DELETE SET NULL,
        customer_name VARCHAR(255) NOT NULL,
        customer_email VARCHAR(255) DEFAULT '',
        quantity INTEGER DEFAULT 1,
        unit_price DECIMAL(10,2) NOT NULL,
        total DECIMAL(10,2) NOT NULL,
        payment_type VARCHAR(50) DEFAULT 'Belirtilmemiş',
        notes TEXT DEFAULT '',
        status VARCHAR(20) DEFAULT 'completed',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ DB Migration: shop_orders tablosu hazır.');
  } catch (e: any) {
    console.error('⚠️ DB Migration (shop_orders) hatası:', e.message);
  }

  // Destek / Şikayet Tablosu
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES up_users(id) ON DELETE SET NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        subject VARCHAR(500) NOT NULL,
        message TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'open',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ DB Migration: support_tickets tablosu hazır.');
  } catch (e: any) {
    console.error('⚠️ DB Migration (support_tickets) hatası:', e.message);
  }

  // Password Reset Alanları
  try {
    await pool.query('ALTER TABLE up_users ADD COLUMN IF NOT EXISTS reset_token TEXT');
    await pool.query('ALTER TABLE up_users ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP');
    console.log('✅ DB Migration: reset_token sütunları hazır.');
  } catch (e: any) {
    console.error('⚠️ DB Migration (reset_token) hatası:', e.message);
  }

  // Projelerimiz Tablosu
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        document_id VARCHAR(255) UNIQUE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100) DEFAULT 'Genel',
        media_type VARCHAR(50) DEFAULT 'image',
        media_url TEXT,
        thumbnail_url TEXT,
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP(6),
        updated_at TIMESTAMP(6)
      )
    `);
    await pool.query("ALTER TABLE projects ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'Genel'");
    await pool.query("ALTER TABLE projects ADD COLUMN IF NOT EXISTS media_type VARCHAR(50) DEFAULT 'image'");
    await pool.query('ALTER TABLE projects ADD COLUMN IF NOT EXISTS media_url TEXT');
    await pool.query('ALTER TABLE projects ADD COLUMN IF NOT EXISTS thumbnail_url TEXT');
    await pool.query('ALTER TABLE projects ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0');
    await pool.query('ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true');
    await pool.query('ALTER TABLE projects ADD COLUMN IF NOT EXISTS description TEXT');
    console.log('✅ DB Migration: projects tablosu hazır.');
  } catch (e: any) {
    console.error('⚠️ DB Migration (projects) hatası:', e.message);
  }

  // Performans İndeksleri (B-Tree)
  try {
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_rentals_car_lnk_rental_id ON rentals_car_lnk(rental_id);
      CREATE INDEX IF NOT EXISTS idx_rentals_car_lnk_car_id ON rentals_car_lnk(car_id);
      CREATE INDEX IF NOT EXISTS idx_rentals_user_lnk_rental_id ON rentals_user_lnk(rental_id);
      CREATE INDEX IF NOT EXISTS idx_rentals_user_lnk_user_id ON rentals_user_lnk(user_id);
      CREATE INDEX IF NOT EXISTS idx_files_related_mph_lookup ON files_related_mph(related_id, related_type, field);
      CREATE INDEX IF NOT EXISTS idx_rentals_status ON rentals(rental_status, payment_status, approval_status);
      CREATE INDEX IF NOT EXISTS idx_rentals_dates ON rentals(start_date, end_date);
      CREATE INDEX IF NOT EXISTS idx_cars_available_office ON cars(current_office_id, is_available, published_at);
      CREATE INDEX IF NOT EXISTS idx_offices_is_active ON offices(is_active);
      CREATE INDEX IF NOT EXISTS idx_shop_items_filters ON shop_items(platform, category, is_active);
      CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status, created_at);
      CREATE INDEX IF NOT EXISTS idx_admin_users_lookup ON admin_users(email, role, is_active);
      CREATE INDEX IF NOT EXISTS idx_projects_sort ON projects(is_active, sort_order);
    `);
    console.log('✅ DB Migration: Performans indeksleri (B-Tree) hazır.');
  } catch (e: any) {
    console.error('⚠️ DB Migration (indeksler) hatası:', e.message);
  }
}
