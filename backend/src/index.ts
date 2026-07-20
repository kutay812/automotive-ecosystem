import fs from 'fs';
process.on('uncaughtException', (err) => { fs.writeFileSync('error.log', 'UNCAUGHT: ' + err.stack); });
process.on('unhandledRejection', (reason: any) => { fs.writeFileSync('error.log', 'UNHANDLED: ' + (reason?.stack || reason)); });
console.log('🏁 Backend süreci başlıyor...');
import express from 'express';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import cors from 'cors';
import path from 'path';
import nodemailer from 'nodemailer';
import rateLimit from 'express-rate-limit';

// ========== CONFIG ==========
const PORT = parseInt(process.env.PORT || '1337');
const JWT_SECRET = process.env.JWT_SECRET || 'example-jwt-secret-2026';
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'example-admin-jwt-secret-2026';
const ADMIN_SECRET = 'example-secret-google-123';
type AdminRole = 'superadmin' | 'admin' | 'editor';
const MANAGEABLE_ADMIN_ROLES: Exclude<AdminRole, 'superadmin'>[] = ['admin', 'editor'];
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = `http://localhost:${PORT}/api/connect/google/callback`;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Enforce secrets in production
if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'example-jwt-secret-2026') {
    console.error('CRITICAL ERROR: JWT_SECRET is missing or default in production!');
    process.exit(1);
  }
  if (!process.env.ADMIN_JWT_SECRET || process.env.ADMIN_JWT_SECRET === 'example-admin-jwt-secret-2026') {
    console.error('CRITICAL ERROR: ADMIN_JWT_SECRET is missing or default in production!');
    process.exit(1);
  }
  if (!process.env.PAYMENT_WEBHOOK_SECRET || process.env.PAYMENT_WEBHOOK_SECRET === 'example-payment-secret-2026') {
    console.error('CRITICAL ERROR: PAYMENT_WEBHOOK_SECRET is missing or default in production!');
    process.exit(1);
  }
}

// ========== EMAIL CONFIG ==========
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587'),
  auth: {
    user: process.env.SMTP_USER || 'ethereal_user',
    pass: process.env.SMTP_PASS || 'ethereal_pass',
  },
});

// ========== APP ==========
const app = express();
app.use(express.json());

// Global Input Sanitization Middleware (XSS Protection)
function sanitizeInput(req: any, res: any, next: any) {
  if (req.body && typeof req.body === 'object') {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].replace(/<[^>]*>?/gm, '').trim();
      }
    }
  }
  next();
}
app.use(sanitizeInput);

// Strict CORS (CSRF Defense-in-depth)
app.use(cors({ origin: [FRONTEND_URL, 'http://localhost:3000'], credentials: true }));

// Rate Limiter Middleware
const rateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per `window`
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { error: { message: 'Çok fazla istek gönderdiniz. Lütfen 15 dakika sonra tekrar deneyin.' } }
});
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

process.on('uncaughtException', (err) => {
  console.error('🔥 KRİTİK HATA (Uncaught):', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 KRİTİK HATA (Unhandled):', reason);
});

// ========== DATABASE ==========
const pool = new Pool({
  host: process.env.DATABASE_HOST || 'postgres',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  database: process.env.DATABASE_NAME || 'example_db',
  user: process.env.DATABASE_USERNAME || 'example',
  password: process.env.DATABASE_PASSWORD || 'example_pwd',
});

// Veritabanı başlatma ve tablo güncellemeleri
async function initDatabase(retries = 5) {
  while (retries > 0) {
    try {
      console.log(`📡 Veritabanına bağlanılıyor... (Kalan deneme: ${retries})`);
      await pool.query('SELECT 1'); // Test query

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
initDatabase();

// ========== HELPERS ==========
function genDocId() { return crypto.randomBytes(12).toString('hex').slice(0, 24); }
function signToken(userId: number, docId: string) {
  return jwt.sign({ id: userId, documentId: docId }, JWT_SECRET, { expiresIn: '7d' });
}
function now() { return new Date().toISOString(); }

// Admin JWT helpers
function signAdminToken(adminUser: { id: number; document_id: string; email: string; role: string; first_name: string; last_name: string }) {
  return jwt.sign(
    { adminId: adminUser.id, documentId: adminUser.document_id, email: adminUser.email, role: adminUser.role, firstName: adminUser.first_name, lastName: adminUser.last_name },
    ADMIN_JWT_SECRET,
    { expiresIn: '24h' }
  );
}

// Admin Auth Middleware — Extracts admin user from JWT, attaches to req.admin
function adminAuthMiddleware(req: any, res: any, next: any) {
  // Support both Bearer token and legacy secret-based auth
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(authHeader.split(' ')[1], ADMIN_JWT_SECRET) as any;
      if (!payload.adminId) return res.status(401).json({ error: { message: 'Geçersiz admin token.' } });
      req.admin = payload;
      return next();
    } catch {
      return res.status(401).json({ error: { message: 'Admin token süresi dolmuş veya geçersiz.' } });
    }
  }
  // Legacy fallback: secret-based auth (will be removed eventually)
  const secret = req.body?.secret || req.query?.secret;
  if (secret === ADMIN_SECRET) {
    req.admin = { role: 'superadmin' }; // Legacy: full access
    return next();
  }
  return res.status(401).json({ error: { message: 'Yetkilendirme gerekli.' } });
}

// Role Guard Factory — restricts access to specific admin roles
function requireRole(...allowedRoles: AdminRole[]) {
  return (req: any, res: any, next: any) => {
    adminAuthMiddleware(req, res, () => {
      if (!allowedRoles.includes(req.admin?.role)) {
        return res.status(403).json({ error: { message: `Bu işlem için yetkiniz yok. Gerekli roller: ${allowedRoles.join(', ')}` } });
      }
      next();
    });
  };
}

// Helper: Yeni kullanıcıya varsayılan 'authenticated' rolünü ata
async function assignDefaultRole(userId: number) {
  try {
    const roleResult = await pool.query("SELECT id FROM up_roles WHERE type = 'authenticated'");
    if (roleResult.rows.length > 0) {
      await pool.query(
        "INSERT INTO up_users_role_lnk (user_id, role_id) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING",
        [userId, roleResult.rows[0].id]
      );
    }
  } catch (e) {
    console.error('Rol atama hatası:', e);
  }
}

// JWT Middleware (★ Anlık engel kontrolü ile)
async function authMiddleware(req: any, res: any, next: any) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: { message: 'Token gerekli.' } });
  try {
    const payload = jwt.verify(header.split(' ')[1], JWT_SECRET) as any;
    req.userId = payload.id;
    req.userDocId = payload.documentId;

    // ★ Aktif kullanıcılar için anlık engel kontrolü (ban sırasında oturumu kes)
    const userCheck = await pool.query('SELECT blocked FROM up_users WHERE id = $1', [payload.id]);
    if (userCheck.rows.length > 0 && userCheck.rows[0].blocked) {
      return res.status(403).json({ error: { message: 'Hesabınız yönetici tarafından askıya alınmıştır.' } });
    }

    next();
  } catch {
    return res.status(401).json({ error: { message: 'Geçersiz token.' } });
  }
}

// Araç resmini çek
async function getCarImage(carId: number): Promise<any> {
  const result = await pool.query(
    `SELECT f.url, f.name, f.formats FROM files f
     JOIN files_related_mph frm ON frm.file_id = f.id
     WHERE frm.related_id = $1 AND frm.related_type = 'api::car.car' AND frm.field = 'image'
     LIMIT 1`, [carId]
  );
  if (result.rows.length === 0) return null;
  return { url: result.rows[0].url, name: result.rows[0].name };
}

// Strapi formatında araç objesi
async function formatCar(row: any): Promise<any> {
  let image = await getCarImage(row.id);
  // Eğer özel image_url varsa onu kullan
  if (row.image_url) {
    image = { url: row.image_url, name: 'car-image' };
  }

  return {
    id: row.id,
    documentId: row.document_id,
    brand: row.brand,
    model: row.model,
    year: row.year ? Number(row.year) : null,
    pricePerDay: row.price_per_day,
    description: row.description,
    isAvailable: row.is_available,
    transmission: row.transmission,
    fuelType: row.fuel_type,
    passengerCount: row.passenger_count,
    luggageCount: row.luggage_count,
    availableUntil: row.available_until,
    image: image,
    imageUrl: row.image_url,
    currentOfficeId: row.current_office_id || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function formatUser(row: any) {
  return {
    id: row.id,
    documentId: row.document_id,
    username: row.username,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    provider: row.provider,
    googleId: row.google_id || null,
    confirmed: row.confirmed,
    blocked: row.blocked,
    phoneNumber: row.phone_number || null,
    phoneVerifiedAt: row.phone_verified_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function formatRental(row: any): Promise<any> {
  // Araç bilgisini çek
  let car = null;
  const carLnk = await pool.query('SELECT car_id FROM rentals_car_lnk WHERE rental_id = $1', [row.id]);
  if (carLnk.rows.length > 0) {
    const carRow = await pool.query('SELECT * FROM cars WHERE id = $1', [carLnk.rows[0].car_id]);
    if (carRow.rows.length > 0) car = await formatCar(carRow.rows[0]);
  }

  // Kullanıcı bilgisini çek
  let user = null;
  const userLnk = await pool.query('SELECT user_id FROM rentals_user_lnk WHERE rental_id = $1', [row.id]);
  if (userLnk.rows.length > 0) {
    const userRow = await pool.query('SELECT * FROM up_users WHERE id = $1', [userLnk.rows[0].user_id]);
    if (userRow.rows.length > 0) user = formatUser(userRow.rows[0]);
  }

  // Ofis il/şehir bilgilerini çek ve ekle
  let pickupOffice = row.pickup_office;
  let dropoffOffice = row.dropoff_office;

  if (row.pickup_office) {
    const pickupOfficeRes = await pool.query('SELECT city FROM offices WHERE name = $1 LIMIT 1', [row.pickup_office]);
    if (pickupOfficeRes.rows.length > 0 && pickupOfficeRes.rows[0].city) {
      pickupOffice = `${row.pickup_office} (${pickupOfficeRes.rows[0].city})`;
    }
  }

  if (row.dropoff_office) {
    const dropoffOfficeRes = await pool.query('SELECT city FROM offices WHERE name = $1 LIMIT 1', [row.dropoff_office]);
    if (dropoffOfficeRes.rows.length > 0 && dropoffOfficeRes.rows[0].city) {
      dropoffOffice = `${row.dropoff_office} (${dropoffOfficeRes.rows[0].city})`;
    }
  }

  return {
    id: row.id,
    documentId: row.document_id,
    rentalStatus: row.rental_status,
    pickupOffice,
    dropoffOffice,
    startDate: row.start_date,
    endDate: row.end_date,
    requestedEndDate: row.requested_end_date || null,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    approvalStatus: row.approval_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    car,
    user,
  };
}

// ==========================================
// ========== AUTH ROUTES ==========
// ==========================================

// E-posta ile giriş
app.post('/api/auth/local', rateLimitMiddleware, async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // 1. Önce site kullanıcılarında ara (up_users)
    const siteResult = await pool.query('SELECT * FROM up_users WHERE email = $1 OR username = $1', [identifier]);
    if (siteResult.rows.length > 0) {
      const user = siteResult.rows[0];
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return res.status(400).json({ error: { message: 'E-posta veya şifre hatalı.' } });

      // ★ Engel (ban) kontrolü — token üretmeden önce
      if (user.blocked) {
        return res.status(403).json({ error: { message: 'Hesabınız yönetici tarafından askıya alınmıştır.' } });
      }

      const token = signToken(user.id, user.document_id);
      const response: any = { jwt: token, user: formatUser(user) };

      // Eğer bu e-posta aynı zamanda admin_users'ta da varsa, admin token'ı da ekle
      const adminCheck = await pool.query('SELECT * FROM admin_users WHERE email = $1 AND is_active = true', [user.email]);
      if (adminCheck.rows.length > 0) {
        response.adminJwt = signAdminToken(adminCheck.rows[0]);
        response.adminRole = adminCheck.rows[0].role;
      }

      return res.json(response);
    }

    // 2. Site kullanıcısı bulunamadı — admin_users tablosunda ara
    const adminResult = await pool.query('SELECT * FROM admin_users WHERE email = $1 AND is_active = true', [identifier]);
    if (adminResult.rows.length > 0) {
      const admin = adminResult.rows[0];
      const valid = await bcrypt.compare(password, admin.password_hash);
      if (!valid) return res.status(400).json({ error: { message: 'E-posta veya şifre hatalı.' } });

      // Admin için site tarafında da bir oturum aç (up_users'ta yoksa boş token ile)
      const adminJwt = signAdminToken(admin);
      return res.json({
        jwt: null, // Site jwt yok, admin-only hesap
        adminJwt,
        adminRole: admin.role,
        user: {
          id: admin.id,
          documentId: admin.document_id,
          email: admin.email,
          firstName: admin.first_name,
          lastName: admin.last_name,
          username: admin.email,
          provider: 'admin',
        },
      });
    }

    return res.status(400).json({ error: { message: 'E-posta veya şifre hatalı.' } });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Kayıt ol
app.post('/api/auth/local/register', rateLimitMiddleware, async (req, res) => {
  try {
    const { username, email, password, phone, acceptedTerms } = req.body;
    
    // KVKK ve Sözleşme Onay Kontrolü
    if (!acceptedTerms) {
      return res.status(400).json({ error: { message: 'KVKK Aydınlatma Metni ve Kullanıcı Sözleşmesini kabul etmelisiniz.' } });
    }

    if (!phone) return res.status(400).json({ error: { message: 'Telefon numarası zorunludur.' } });
    
    // Telefon Validasyonu
    const phoneRegex = /^[0-9\+\-\(\)\s]+$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ error: { message: 'Geçersiz telefon numarası formatı. Sadece rakamlar ve +, -, (, ) işaretleri kullanılabilir.' } });
    }

    const exists = await pool.query('SELECT id FROM up_users WHERE email = $1', [email]);
    if (exists.rows.length > 0) return res.status(400).json({ error: { message: 'Bu e-posta zaten kayıtlı.' } });

    const hash = await bcrypt.hash(password, 10);
    const docId = genDocId();
    const result = await pool.query(
      `INSERT INTO up_users (document_id, username, email, password, provider, confirmed, blocked, created_at, updated_at, published_at, phone_number, phone_verified_at)
       VALUES ($1, $2, $3, $4, 'local', true, false, $5, $5, $5, $6, $5) RETURNING *`,
      [docId, username, email, hash, now(), phone]
    );

    const user = result.rows[0];
    await assignDefaultRole(user.id);
    const token = signToken(user.id, user.document_id);
    res.json({ jwt: token, user: formatUser(user) });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Şifremi Unuttum (Forgot Password)
app.post('/api/auth/forgot-password', rateLimitMiddleware, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: { message: 'E-posta adresi gereklidir.' } });

    const result = await pool.query('SELECT id, first_name FROM up_users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      // Güvenlik için, e-posta bulunamasa bile her zaman başarılı mesajı dönüyoruz
      return res.json({ ok: true });
    }

    const user = result.rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 saat geçerli

    await pool.query('UPDATE up_users SET reset_token = $1, reset_token_expiry = $2 WHERE id = $3', [token, expiry, user.id]);

    const resetLink = `${FRONTEND_URL}/reset-password?token=${token}`;

    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"Example Destek" <noreply@example.com>',
        to: email,
        subject: 'Şifre Sıfırlama Talebi - Example',
        html: `
          <h3>Merhaba ${user.first_name || ''},</h3>
          <p>Şifrenizi sıfırlamak için bir talepte bulundunuz. Aşağıdaki linke tıklayarak yeni şifrenizi belirleyebilirsiniz:</p>
          <p><a href="${resetLink}" style="padding: 10px 20px; background-color: #ff5a00; color: #000; text-decoration: none; border-radius: 5px; font-weight: bold;">Şifremi Sıfırla</a></p>
          <p>Bu link 1 saat boyunca geçerlidir. Eğer bu talebi siz yapmadıysanız lütfen bu e-postayı dikkate almayınız.</p>
        `
      });
      console.log(`✉️ Şifre sıfırlama maili gönderildi: ${email} (Mock/SMTP)`);
    } catch (mailErr) {
      console.error('Mail gönderim hatası:', mailErr);
      // Dev ortamı için konsola token'ı basıyoruz
      console.log(`[DEV ONLY] Şifre Sıfırlama Linki: ${resetLink}`);
    }

    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Şifre Sıfırlama (Reset Password)
app.post('/api/auth/reset-password', rateLimitMiddleware, async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: { message: 'Token ve yeni şifre gereklidir.' } });

    if (password.length < 6) return res.status(400).json({ error: { message: 'Şifre en az 6 karakter olmalıdır.' } });

    const result = await pool.query('SELECT id FROM up_users WHERE reset_token = $1 AND reset_token_expiry > NOW()', [token]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: { message: 'Geçersiz veya süresi dolmuş token.' } });
    }

    const userId = result.rows[0].id;
    const hash = await bcrypt.hash(password, 10);

    await pool.query('UPDATE up_users SET password = $1, reset_token = NULL, reset_token_expiry = NULL WHERE id = $2', [hash, userId]);

    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Mevcut kullanıcı
app.get('/api/users/me', authMiddleware, async (req: any, res) => {
  try {
    const result = await pool.query('SELECT * FROM up_users WHERE id = $1', [req.userId]);
    if (result.rows.length === 0) return res.status(401).json({ error: { message: 'Kullanıcı bulunamadı.' } });
    res.json(formatUser(result.rows[0]));
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Profil güncelleme
app.post('/api/user-extension/update-profile', authMiddleware, async (req: any, res: any) => {
  try {
    const { username, firstName, lastName, phoneNumber } = req.body;
    const userId = req.userId; // IDOR: Sadece oturum açan kullanıcı kendi profilini güncelleyebilir

    if (phoneNumber) {
      const phoneRegex = /^[0-9\+\-\(\)\s]+$/;
      if (!phoneRegex.test(phoneNumber)) {
        return res.status(400).json({ error: { message: 'Geçersiz telefon numarası formatı. Sadece rakamlar ve +, -, (, ) işaretleri kullanılabilir.' } });
      }
    }

    await pool.query(
      `UPDATE up_users SET username = COALESCE($1, username), first_name = COALESCE($2, first_name), last_name = COALESCE($3, last_name), phone_number = COALESCE($4, phone_number), updated_at = $5 WHERE id = $6`,
      [username, firstName, lastName, phoneNumber, now(), userId]
    );
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Telefon numarası doğrulama (Gelecek SMS entegrasyonu altyapısı)
app.post('/api/user-extension/verify-phone', authMiddleware, async (req: any, res: any) => {
  try {
    const { phone } = req.body;
    const userId = req.userId; // IDOR

    if (!phone) return res.status(400).json({ error: { message: 'Telefon numarası eksik.' } });

    // Şimdilik SMS kontrolü yapmadan doğrudan doğrulanmış sayıyoruz
    await pool.query(
      `UPDATE up_users SET phone_number = $1, phone_verified_at = $2, updated_at = $2 WHERE id = $3`,
      [phone, now(), userId]
    );
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// ==========================================
// ========== PROFİL DETAYLARI (Dashboard) ==========
// ==========================================

app.get('/api/user/profile-details', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.userId;

    // 1. Kullanıcı bilgileri + rol
    const userResult = await pool.query(`
      SELECT u.*, r.name as role_name, r.type as role_type
      FROM up_users u
      LEFT JOIN up_users_role_lnk url ON url.user_id = u.id
      LEFT JOIN up_roles r ON r.id = url.role_id
      WHERE u.id = $1
    `, [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Kullanıcı bulunamadı.' } });
    }
    const u = userResult.rows[0];

    // 2. Tüm kiralamalar (araç bilgisi ile)
    const rentalsResult = await pool.query(`
      SELECT r.*, c.brand as car_brand, c.model as car_model, c.image_url as car_image_url,
             c.price_per_day as car_price_per_day
      FROM rentals r
      JOIN rentals_user_lnk rul ON rul.rental_id = r.id
      LEFT JOIN rentals_car_lnk rcl ON rcl.rental_id = r.id
      LEFT JOIN cars c ON c.id = rcl.car_id
      WHERE rul.user_id = $1
      ORDER BY r.created_at DESC
    `, [userId]);

    const rentals = rentalsResult.rows.map(r => ({
      id: r.id,
      documentId: r.document_id,
      rentalStatus: r.rental_status,
      pickupOffice: r.pickup_office,
      dropoffOffice: r.dropoff_office,
      startDate: r.start_date,
      endDate: r.end_date,
      requestedEndDate: r.requested_end_date || null,
      approvalStatus: r.approval_status,
      paymentMethod: r.payment_method,
      paymentStatus: r.payment_status,
      createdAt: r.created_at,
      car: r.car_brand ? {
        brand: r.car_brand,
        model: r.car_model,
        imageUrl: r.car_image_url,
        pricePerDay: r.car_price_per_day,
      } : null,
    }));

    // 3. E-ticaret siparişleri (email eşleşmesi ile)
    const ordersResult = await pool.query(`
      SELECT o.*, si.title as item_title, si.image_url as item_image_url, si.platform as item_platform
      FROM shop_orders o
      LEFT JOIN shop_items si ON si.id = o.shop_item_id
      WHERE o.customer_email = $1
      ORDER BY o.created_at DESC
    `, [u.email]);

    const orders = ordersResult.rows.map(o => ({
      id: o.id,
      itemTitle: o.item_title || 'Ürün',
      itemImageUrl: o.item_image_url || '',
      itemPlatform: o.item_platform || '',
      customerName: o.customer_name,
      quantity: o.quantity,
      unitPrice: o.unit_price,
      total: o.total,
      paymentType: o.payment_type,
      status: o.status,
      notes: o.notes,
      createdAt: o.created_at,
    }));

    // Özet istatistikler
    const activeRentals = rentals.filter(r => ['aktif', 'uzatma_talep', 'iade_bildirildi', 'erken_teslim_talep'].includes(r.rentalStatus));
    const completedRentals = rentals.filter(r => r.rentalStatus === 'bitti');
    const completedOrders = orders.filter(o => o.status === 'completed');

    res.json({
      user: {
        id: u.id,
        documentId: u.document_id,
        username: u.username,
        email: u.email,
        firstName: u.first_name,
        lastName: u.last_name,
        provider: u.provider,
        googleId: u.google_id || null,
        confirmed: u.confirmed,
        blocked: u.blocked,
        phoneNumber: u.phone_number || null,
        phoneVerifiedAt: u.phone_verified_at || null,
        role: u.role_name || 'Authenticated',
        createdAt: u.created_at,
        updatedAt: u.updated_at,
      },
      stats: {
        totalRentals: rentals.length,
        activeRentals: activeRentals.length,
        completedRentals: completedRentals.length,
        totalOrders: orders.length,
        completedOrders: completedOrders.length,
      },
      rentals,
      orders,
    });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// ========== GOOGLE OAUTH ==========

// 1. Google'a yönlendir
app.get('/api/connect/google', (req, res) => {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    prompt: 'consent',
    access_type: 'offline',
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

// 2. Google'dan geri dön → code'u token'a çevir → frontend'e yönlendir
app.get('/api/connect/google/callback', async (req, res) => {
  try {
    const code = req.query.code as string;
    if (!code) return res.status(400).send('Code bulunamadı.');

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) return res.status(400).send('Token alınamadı: ' + JSON.stringify(tokenData));

    // Frontend'e access_token ile yönlendir
    res.redirect(`${FRONTEND_URL}/callback/google?access_token=${tokenData.access_token}`);
  } catch (e: any) {
    res.status(500).send('OAuth hatası: ' + e.message);
  }
});

// 3. Google access_token ile kullanıcı oluştur/getir
app.get('/api/auth/google/callback', async (req, res) => {
  try {
    const accessToken = req.query.access_token as string;
    if (!accessToken) return res.status(400).json({ error: { message: 'access_token gerekli.' } });

    // Google'dan profil bilgisini al
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const profile: any = await profileRes.json();
    if (!profile.email) return res.status(400).json({ error: { message: 'Google profili alınamadı.' } });

    // Kullanıcıyı bul: önce google_id, sonra email ile
    let userResult = await pool.query('SELECT * FROM up_users WHERE google_id = $1', [profile.sub]);
    if (userResult.rows.length === 0) {
      userResult = await pool.query('SELECT * FROM up_users WHERE email = $1', [profile.email]);
    }
    let user;

    if (userResult.rows.length > 0) {
      user = userResult.rows[0];
      // google_id'yi ve ad soyadı güncelle (hesap birleştirme)
      await pool.query(
        'UPDATE up_users SET google_id = COALESCE($1, google_id), first_name = COALESCE($2, first_name), last_name = COALESCE($3, last_name), username = COALESCE($4, username), updated_at = $5 WHERE id = $6',
        [profile.sub, profile.given_name, profile.family_name || '-', profile.name || profile.email.split('@')[0], now(), user.id]
      );
      // provider'ı 'local' olan kullanıcıda değiştirme — sadece google_id bağla
      userResult = await pool.query('SELECT * FROM up_users WHERE id = $1', [user.id]);
      user = userResult.rows[0];
    } else {
      const docId = genDocId();
      const randomPass = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
      const insertResult = await pool.query(
        `INSERT INTO up_users (document_id, username, email, password, provider, first_name, last_name, google_id, confirmed, blocked, created_at, updated_at, published_at)
         VALUES ($1, $2, $3, $4, 'google', $5, $6, $7, true, false, $8, $8, $8) RETURNING *`,
        [docId, profile.name || profile.email.split('@')[0], profile.email, randomPass, profile.given_name || '', profile.family_name || '-', profile.sub, now()]
      );
      user = insertResult.rows[0];
      await assignDefaultRole(user.id);
    }

    // ★ Google OAuth engel (ban) kontrolü
    if (user.blocked) {
      return res.status(403).json({ error: { message: 'Hesabınız yönetici tarafından askıya alınmıştır.' } });
    }

    const token = signToken(user.id, user.document_id);
    const response: any = { jwt: token, user: formatUser(user) };

    // Admin kullanıcısıysa admin JWT de ekle (rol koruması)
    const adminCheck = await pool.query('SELECT * FROM admin_users WHERE email = $1 AND is_active = true', [user.email]);
    if (adminCheck.rows.length > 0) {
      response.adminJwt = signAdminToken(adminCheck.rows[0]);
      response.adminRole = adminCheck.rows[0].role;
    }

    res.json(response);
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// ==========================================
// ========== CAR ROUTES ==========
// ==========================================

app.get('/api/cars', async (req, res) => {
  try {
    const pickupOffice = req.query.pickupOffice as string | undefined;
    let result;
    if (pickupOffice) {
      // Option B: Only show cars assigned to this specific office (NULL = hidden)
      result = await pool.query(
        'SELECT * FROM cars WHERE published_at IS NOT NULL AND current_office_id = $1 ORDER BY id DESC',
        [pickupOffice]
      );
    } else {
      // No filter: return all published cars
      result = await pool.query('SELECT * FROM cars WHERE published_at IS NOT NULL ORDER BY id DESC');
    }
    const cars = await Promise.all(result.rows.map(formatCar));
    res.json({ data: cars });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

app.post('/api/cars', async (req, res) => {
  try {
    const d = req.body.data;
    const docId = genDocId();
    const result = await pool.query(
      `INSERT INTO cars (document_id, brand, model, year, price_per_day, description, is_available, transmission, fuel_type, passenger_count, luggage_count, image_url, current_office_id, created_at, updated_at, published_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$14,$14) RETURNING *`,
      [docId, d.brand, d.model, d.year, d.pricePerDay, d.description || null, d.isAvailable !== false, d.transmission || 'Otomatik', d.fuelType || 'Benzin', d.passengerCount || 5, d.luggageCount || 2, d.imageUrl || null, d.currentOfficeId || null, now()]
    );
    const car = await formatCar(result.rows[0]);
    res.json({ data: car });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

app.put('/api/cars/:id', async (req, res) => {
  try {
    const d = req.body.data;
    const sets: string[] = [];
    const vals: any[] = [];
    let idx = 1;

    const fields: any = {
      brand: 'brand', model: 'model', year: 'year', pricePerDay: 'price_per_day',
      description: 'description', isAvailable: 'is_available', transmission: 'transmission',
      fuelType: 'fuel_type', passengerCount: 'passenger_count', luggageCount: 'luggage_count',
      imageUrl: 'image_url', currentOfficeId: 'current_office_id',
    };

    for (const [key, col] of Object.entries(fields)) {
      if (d[key] !== undefined) { sets.push(`${col} = $${idx}`); vals.push(d[key]); idx++; }
    }
    sets.push(`updated_at = $${idx}`); vals.push(now()); idx++;
    vals.push(req.params.id);

    await pool.query(`UPDATE cars SET ${sets.join(', ')} WHERE document_id = $${idx} OR id::text = $${idx}`, vals);
    res.json({ data: { ok: true } });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

app.delete('/api/cars/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM cars WHERE document_id = $1 OR id::text = $1', [req.params.id]);
    res.json({ data: { ok: true } });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// ==========================================
// ========== RENTAL OPERATIONS ==========
// ==========================================

// Tarih çakışma kontrolü
async function checkDateConflict(carDocId: string, startDate: string, endDate: string, excludeDocId?: string) {
  const carResult = await pool.query('SELECT id FROM cars WHERE document_id = $1', [carDocId]);
  if (carResult.rows.length === 0) return false;
  const carId = carResult.rows[0].id;

  const rentals = await pool.query(
    `SELECT r.* FROM rentals r JOIN rentals_car_lnk rcl ON rcl.rental_id = r.id
     WHERE rcl.car_id = $1 AND r.rental_status NOT IN ('bitti', 'iptal')`, [carId]
  );

  for (const r of rentals.rows) {
    if (excludeDocId && r.document_id === excludeDocId) continue;
    const rEnd = r.requested_end_date || r.end_date;
    if (new Date(startDate) <= new Date(rEnd) && new Date(r.start_date) <= new Date(endDate)) {
      return true;
    }
  }
  return false;
}

// Kiralama oluştur
app.post('/api/rental-operations/create', authMiddleware, async (req: any, res: any) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { carId, pickupOffice, dropoffOffice, startDate, endDate, paymentMethod } = req.body;
    const userId = req.userId; // JWT'den güvenli bir şekilde alınır (IDOR Koruması)

    // Kullanıcı telefon doğrulama kontrolü
    let userResult = await client.query('SELECT * FROM up_users WHERE id = $1', [userId]);

    if (userResult.rows.length > 0) {
      const u = userResult.rows[0];
      if (!u.phone_number || !u.phone_verified_at) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: { message: 'Lütfen araç kiralamadan önce telefon numaranızı hesabınıza ekleyip doğrulayın.' } });
      }
    } else {
       await client.query('ROLLBACK');
       return res.status(404).json({ error: { message: 'Kullanıcı bulunamadı.' } });
    }

    // Araç kontrolü (FOR UPDATE kilidi ile Race Condition Koruması)
    const carResult = await client.query('SELECT * FROM cars WHERE document_id = $1 FOR UPDATE', [carId]);
    if (carResult.rows.length === 0 || carResult.rows[0].is_available === false) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: { message: 'Bu araç müsait değil.' } });
    }
    const actualCarId = carResult.rows[0].id;

    // Tarih Validasyonu 1: Teslim tarihi alış tarihinden önce olamaz
    if (new Date(endDate) <= new Date(startDate)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: { message: 'Teslim tarihi, alış tarihinden sonra olmalıdır.', details: 'Teslim tarihi, alış tarihinden sonra olmalıdır.' } });
    }

    // Çakışma kontrolü (Kilitli araç için veritabanında aktif kiralama var mı kontrolü)
    const conflictRentals = await client.query(
      `SELECT r.* FROM rentals r JOIN rentals_car_lnk rcl ON rcl.rental_id = r.id
       WHERE rcl.car_id = $1 AND r.rental_status NOT IN ('bitti', 'iptal')`, [actualCarId]
    );

    let hasConflict = false;
    for (const r of conflictRentals.rows) {
      const rEnd = r.requested_end_date || r.end_date;
      if (new Date(startDate) <= new Date(rEnd) && new Date(r.start_date) <= new Date(endDate)) {
        hasConflict = true;
        break;
      }
    }

    if (hasConflict) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: { message: 'Bu araç seçtiğiniz tarihler arasında zaten kirada.' } });
    }

    const docId = genDocId();
    const pMethod = paymentMethod || 'office';
    const pStatus = pMethod === 'online' ? 'pending' : 'office_payment';
    const aStatus = pMethod === 'online' ? 'approved' : 'waiting_admin';

    const rental = await client.query(
      `INSERT INTO rentals (document_id, rental_status, pickup_office, dropoff_office, start_date, end_date, original_end_date, created_at, updated_at, published_at, payment_method, payment_status, approval_status)
       VALUES ($1, 'bekliyor', $2, $3, $4::timestamp, $5::timestamp, $5::timestamp, $6::timestamp, $6::timestamp, $6::timestamp, $7, $8, $9) RETURNING *`,
      [docId, pickupOffice, dropoffOffice, startDate, endDate, now(), pMethod, pStatus, aStatus]
    );
    const rentalId = rental.rows[0].id;

    // Link: rental → car
    await client.query('INSERT INTO rentals_car_lnk (rental_id, car_id) VALUES ($1, $2)', [rentalId, actualCarId]);

    // Link: rental → user
    await client.query('INSERT INTO rentals_user_lnk (rental_id, user_id) VALUES ($1, $2)', [rentalId, userId]);

    await client.query('COMMIT');
    res.json(await formatRental(rental.rows[0]));
  } catch (e: any) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: { message: e.message, details: e.message } });
  } finally {
    client.release();
  }
});

// Durum güncelle (kullanıcı tarafı)
app.post('/api/rental-operations/update-status', authMiddleware, async (req: any, res: any) => {
  try {
    const { rentalId, rentalStatus, requestedEndDate } = req.body;
    const userId = req.userId;

    const rental = await pool.query('SELECT * FROM rentals WHERE document_id = $1', [rentalId]);
    if (rental.rows.length === 0) return res.status(404).json({ error: { message: 'Kiralama bulunamadı.' } });
    const currentRental = rental.rows[0];

    // IDOR Kontrolü: Bu kiralama, isteği yapan kullanıcıya mı ait?
    const userLnk = await pool.query('SELECT user_id FROM rentals_user_lnk WHERE rental_id = $1', [currentRental.id]);
    if (userLnk.rows.length === 0 || userLnk.rows[0].user_id !== userId) {
      return res.status(403).json({ error: { message: 'Bu kiralama üzerinde işlem yapma yetkiniz yok.' } });
    }

    // Tarih Validasyonu 2: Uzatma tarihi mevcut bitiş tarihinden sonra olmalı
    if (rentalStatus === 'uzatma_talep' && requestedEndDate) {
      const currentEnd = new Date(currentRental.end_date);
      const newEnd = new Date(requestedEndDate);
      if (newEnd <= currentEnd) {
        return res.status(400).json({ error: { message: 'Uzatma tarihi, mevcut teslim tarihinden (' + currentEnd.toLocaleDateString('tr-TR') + ') daha ileri olmalıdır.' } });
      }
    }

    // Tarih Validasyonu 3: Erken teslim tarihi alış günüyle aynı olamaz
    // (Only applies to early return requests, not the admin-set iade_bildirildi)
    if (rentalStatus === 'iade_bildirildi' && requestedEndDate) {
      const startD = new Date(currentRental.start_date);
      const returnD = new Date(requestedEndDate);
      if (returnD <= startD) {
        return res.status(400).json({ error: { message: 'Erken teslim tarihi, alış tarihiyle aynı gün veya daha öncesi olamaz. Minimum 1 gün kiralama zorunludur.' } });
      }
    }

    // Tarih Validasyonu 3b: Erken teslim talebi için aynı kural
    if (rentalStatus === 'erken_teslim_talep' && requestedEndDate) {
      const startD = new Date(currentRental.start_date);
      const returnD = new Date(requestedEndDate);
      if (returnD <= startD) {
        return res.status(400).json({ error: { message: 'Erken teslim tarihi, alış tarihiyle aynı gün veya daha öncesi olamaz. Minimum 1 gün kiralama zorunludur.' } });
      }
    }

    const sets = ['rental_status = $1', 'updated_at = $2'];
    const vals: any[] = [rentalStatus, now()];
    let idx = 3;

    if (requestedEndDate) {
      sets.push(`requested_end_date = $${idx++}`);
      vals.push(requestedEndDate);
    }

    if (rentalStatus === 'uzatma_talep' || rentalStatus === 'erken_teslim_talep' || rentalStatus === 'iade_bildirildi') {
      sets.push(`approval_status = $${idx++}`);
      vals.push('waiting_admin');
    }

    vals.push(rentalId);

    await pool.query(`UPDATE rentals SET ${sets.join(', ')} WHERE document_id = $${idx}`, vals);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ error: { message: e.message } });
  }
});

// Kullanıcının kiralamaları
app.get('/api/rental-operations/my-rentals', authMiddleware, async (req: any, res: any) => {
  try {
    const userId = req.userId;

    const rentals = await pool.query(
      `SELECT r.* FROM rentals r JOIN rentals_user_lnk rul ON rul.rental_id = r.id
       WHERE rul.user_id = $1 ORDER BY r.created_at DESC`, [userId]
    );
    const formatted = await Promise.all(rentals.rows.map(formatRental));
    res.json(formatted);
  } catch (e: any) {
    res.status(400).json({ error: { message: e.message } });
  }
});

// Ödeme başarılı callback'i (HMAC Signature Validation ile korumalı)
app.post('/api/rental-operations/payment/success', rateLimitMiddleware, async (req, res) => {
  try {
    const { rentalId, transactionId } = req.body;
    
    // HMAC Signature Validation
    const signature = req.headers['x-payment-signature'] as string;
    if (!signature) return res.status(401).json({ error: { message: 'İmza eksik.' } });
    
    const payload = JSON.stringify({ rentalId, transactionId });
    const expectedSignature = crypto.createHmac('sha256', process.env.PAYMENT_WEBHOOK_SECRET || 'example-payment-secret-2026')
                                    .update(payload).digest('hex');
    
    if (signature !== expectedSignature) {
      return res.status(401).json({ error: { message: 'Geçersiz ödeme imzası.' } });
    }

    await pool.query(
      `UPDATE rentals 
       SET payment_status = 'paid', rental_status = 'aktif', approval_status = 'approved', transaction_id = $1, paid_at = $2, updated_at = $2 
       WHERE document_id = $3 AND payment_status = 'pending'`,
      [transactionId || 'test_txn_' + genDocId(), now(), rentalId]
    );

    res.json({ ok: true, message: 'Ödeme başarıyla alındı.' });
  } catch (e: any) {
    res.status(400).json({ error: { message: e.message } });
  }
});

// ========== ADMIN RENTAL OPERATIONS ==========

app.get('/api/rental-operations/admin/all', requireRole('superadmin', 'admin', 'editor'), async (req: any, res) => {
  try {
    const rentals = await pool.query('SELECT * FROM rentals ORDER BY created_at DESC');
    const formatted = await Promise.all(rentals.rows.map(formatRental));
    res.json(formatted);
  } catch (e: any) {
    res.status(400).json({ error: { message: e.message } });
  }
});

app.get('/api/rental-operations/admin/stats', requireRole('superadmin', 'admin', 'editor'), async (req: any, res) => {
  try {
    const rentals = await pool.query('SELECT rental_status FROM rentals');
    const cars = await pool.query('SELECT is_available FROM cars WHERE published_at IS NOT NULL');

    res.json({
      totalCars: cars.rows.length,
      availableCars: cars.rows.filter(c => c.is_available !== false).length,
      totalRentals: rentals.rows.length,
      pending: rentals.rows.filter(r => r.rental_status === 'bekliyor').length,
      active: rentals.rows.filter(r => r.rental_status === 'aktif').length,
      extensionRequests: rentals.rows.filter(r => r.rental_status === 'uzatma_talep').length,
      returnNotices: rentals.rows.filter(r => r.rental_status === 'iade_bildirildi').length,
      completed: rentals.rows.filter(r => r.rental_status === 'bitti').length,
      cancelled: rentals.rows.filter(r => r.rental_status === 'iptal').length,
    });
  } catch (e: any) {
    res.status(400).json({ error: { message: e.message } });
  }
});

// Admin aksiyon helper (uses JWT auth from adminAuthMiddleware)
async function adminRentalAction(req: any, res: any, updateFn: (rentalId: string) => Promise<void>) {
  try {
    // Auth already handled by middleware or we check here
    if (!req.admin) {
      // Manual check for endpoints without middleware
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        try {
          const payload = jwt.verify(authHeader.split(' ')[1], ADMIN_JWT_SECRET) as any;
          req.admin = payload;
        } catch {
          return res.status(401).json({ error: { message: 'Geçersiz admin token.' } });
        }
      } else if (req.body?.secret === ADMIN_SECRET) {
        req.admin = { role: 'superadmin' };
      } else {
        return res.status(401).json({ error: { message: 'Yetkilendirme gerekli.' } });
      }
    }
    // Check role for rental operations
    const allowedRoles = ['superadmin', 'admin'];
    if (!allowedRoles.includes(req.admin.role)) {
      return res.status(403).json({ error: { message: 'Bu işlem için yetkiniz yok.' } });
    }
    await updateFn(req.body.rentalId);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ error: { message: e.message, details: e.message } });
  }
}

app.post('/api/rental-operations/admin/approve', (req, res) =>
  adminRentalAction(req, res, async (id) => {
    await pool.query("UPDATE rentals SET rental_status = 'aktif', approval_status = 'approved', updated_at = $1 WHERE document_id = $2", [now(), id]);
  })
);

app.post('/api/rental-operations/admin/reject', (req, res) =>
  adminRentalAction(req, res, async (id) => {
    await pool.query("UPDATE rentals SET rental_status = 'iptal', approval_status = 'rejected', updated_at = $1 WHERE document_id = $2", [now(), id]);
  })
);

// Erken teslim talebini reddet → kiralamayi aktife geri döndür
app.post('/api/rental-operations/admin/reject-early-return', (req, res) =>
  adminRentalAction(req, res, async (id) => {
    await pool.query(
      "UPDATE rentals SET rental_status = 'aktif', approval_status = 'approved', requested_end_date = NULL, updated_at = $1 WHERE document_id = $2",
      [now(), id]
    );
  })
);

app.post('/api/rental-operations/admin/approve-extension', (req, res) =>
  adminRentalAction(req, res, async (id) => {
    const rental = await pool.query('SELECT * FROM rentals WHERE document_id = $1', [id]);
    if (rental.rows.length === 0 || !rental.rows[0].requested_end_date) {
      throw new Error('Uzatma talebi bulunamadı.');
    }
    const r = rental.rows[0];

    // Çakışma kontrolü
    const carLnk = await pool.query('SELECT car_id FROM rentals_car_lnk WHERE rental_id = $1', [r.id]);
    if (carLnk.rows.length > 0) {
      const car = await pool.query('SELECT document_id FROM cars WHERE id = $1', [carLnk.rows[0].car_id]);
      if (car.rows.length > 0) {
        const conflict = await checkDateConflict(car.rows[0].document_id, String(r.end_date), String(r.requested_end_date), r.document_id);
        if (conflict) throw new Error('Uzatma tarihleri başka bir kiralama ile çakışıyor.');
      }
    }

    await pool.query(
      "UPDATE rentals SET end_date = requested_end_date, requested_end_date = NULL, rental_status = 'aktif', approval_status = 'approved', updated_at = $1 WHERE document_id = $2",
      [now(), id]
    );
  })
);

app.post('/api/rental-operations/admin/reject-extension', (req, res) =>
  adminRentalAction(req, res, async (id) => {
    await pool.query("UPDATE rentals SET requested_end_date = NULL, rental_status = 'aktif', approval_status = 'approved', updated_at = $1 WHERE document_id = $2", [now(), id]);
  })
);

app.post('/api/rental-operations/admin/complete', (req, res) =>
  adminRentalAction(req, res, async (id) => {
    // Mark rental as complete
    await pool.query("UPDATE rentals SET rental_status = 'bitti', updated_at = $1 WHERE document_id = $2", [now(), id]);

    // Auto-relocate: update car's current_office_id to the rental's dropoff_office
    try {
      const rentalResult = await pool.query(
        'SELECT r.dropoff_office, rcl.car_id FROM rentals r JOIN rentals_car_lnk rcl ON rcl.rental_id = r.id WHERE r.document_id = $1',
        [id]
      );
      if (rentalResult.rows.length > 0) {
        const { dropoff_office, car_id } = rentalResult.rows[0];
        await pool.query(
          'UPDATE cars SET current_office_id = $1, updated_at = $2 WHERE id = $3',
          [dropoff_office, now(), car_id]
        );
      }
    } catch (relocErr) {
      console.error('Araç konum güncellemesi başarısız:', relocErr);
    }
  })
);

// Admin: Erken teslim talebini onayla
app.post('/api/rental-operations/admin/approve-early-return', (req, res) =>
  adminRentalAction(req, res, async (id) => {
    // Fetch rental to get the requested_end_date (early return date)
    const rentalResult = await pool.query(
      'SELECT r.*, rcl.car_id FROM rentals r LEFT JOIN rentals_car_lnk rcl ON rcl.rental_id = r.id WHERE r.document_id = $1',
      [id]
    );
    if (rentalResult.rows.length === 0) throw new Error('Kiralama bulunamad\u0131.');
    const rental = rentalResult.rows[0];

    // Update end_date to the early return date, move to iade_bildirildi
    // (must NOT go to bitti yet — admin needs to physically receive the car and click 'TESLIM ALINDI')
    const earlyDate = rental.requested_end_date || rental.end_date;
    await pool.query(
      "UPDATE rentals SET rental_status = 'iade_bildirildi', approval_status = 'approved', end_date = $1, requested_end_date = NULL, updated_at = $2 WHERE document_id = $3",
      [earlyDate, now(), id]
    );
  })
);

app.post('/api/rental-operations/admin/mark-paid', (req, res) =>
  adminRentalAction(req, res, async (id) => {
    await pool.query(
      "UPDATE rentals SET payment_status = 'paid', paid_at = $1, updated_at = $1 WHERE document_id = $2",
      [now(), id]
    );
  })
);

app.post('/api/rental-operations/admin/unmark-paid', (req, res) =>
  adminRentalAction(req, res, async (id) => {
    await pool.query(
      "UPDATE rentals SET payment_status = 'pending', paid_at = NULL, updated_at = $1 WHERE document_id = $2",
      [now(), id]
    );
  })
);

// ==========================================
// ========== OFFICE ROUTES ==========
// ==========================================

app.get('/api/offices', async (req, res) => {
  try {
    let query = 'SELECT * FROM offices WHERE published_at IS NOT NULL';
    const filters = req.query?.filters as any;
    if (filters?.isActive?.$eq === 'true') query += ' AND is_active = true';
    const result = await pool.query(query + ' ORDER BY id');
    const data = result.rows.map(r => ({
      id: r.id, documentId: r.document_id, name: r.name, city: r.city,
      isActive: r.is_active, address: r.address, phone: r.phone,
      location: r.location || null,
      openingTime: r.opening_time || null,
      closingTime: r.closing_time || null,
    }));
    res.json({ data });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Admin: ofis ekle
app.post('/api/admin/offices', requireRole('superadmin', 'admin'), async (req: any, res) => {
  try {
    const { name, city, address, phone, location, openingTime, closingTime } = req.body;

    // Saat formatı doğrulama (HH:mm)
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (openingTime && !timeRegex.test(openingTime)) {
      return res.status(400).json({ error: { message: 'Açılış saati HH:mm formatında olmalıdır (Örn: 09:00).' } });
    }
    if (closingTime && !timeRegex.test(closingTime)) {
      return res.status(400).json({ error: { message: 'Kapanış saati HH:mm formatında olmalıdır (Örn: 18:00).' } });
    }

    const docId = genDocId();
    const result = await pool.query(
      `INSERT INTO offices (document_id, name, city, address, phone, location, opening_time, closing_time, is_active, created_at, updated_at, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9, $9, $9) RETURNING *`,
      [docId, name, city, address || '', phone || '', location || '', openingTime || null, closingTime || null, now()]
    );
    res.json({ ok: true, data: result.rows[0] });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Admin: ofis güncelle
app.put('/api/admin/offices/:id', requireRole('superadmin', 'admin'), async (req: any, res) => {
  try {
    const { name, city, address, phone, isActive, location, openingTime, closingTime } = req.body;

    // Saat formatı doğrulama (HH:mm)
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (openingTime !== undefined && openingTime && !timeRegex.test(openingTime)) {
      return res.status(400).json({ error: { message: 'Açılış saati HH:mm formatında olmalıdır (Örn: 09:00).' } });
    }
    if (closingTime !== undefined && closingTime && !timeRegex.test(closingTime)) {
      return res.status(400).json({ error: { message: 'Kapanış saati HH:mm formatında olmalıdır (Örn: 18:00).' } });
    }

    const sets = ['updated_at = $1'];
    const vals: any[] = [now()];
    let idx = 2;

    if (name !== undefined) { sets.push(`name = $${idx}`); vals.push(name); idx++; }
    if (city !== undefined) { sets.push(`city = $${idx}`); vals.push(city); idx++; }
    if (address !== undefined) { sets.push(`address = $${idx}`); vals.push(address); idx++; }
    if (phone !== undefined) { sets.push(`phone = $${idx}`); vals.push(phone); idx++; }
    if (isActive !== undefined) { sets.push(`is_active = $${idx}`); vals.push(isActive); idx++; }
    if (location !== undefined) { sets.push(`location = $${idx}`); vals.push(location); idx++; }
    if (openingTime !== undefined) { sets.push(`opening_time = $${idx}`); vals.push(openingTime); idx++; }
    if (closingTime !== undefined) { sets.push(`closing_time = $${idx}`); vals.push(closingTime); idx++; }

    vals.push(req.params.id);
    await pool.query(`UPDATE offices SET ${sets.join(', ')} WHERE document_id = $${idx} OR id::text = $${idx}`, vals);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Admin: ofis sil
app.delete('/api/admin/offices/:id', requireRole('superadmin', 'admin'), async (req: any, res) => {
  try {
    await pool.query('DELETE FROM offices WHERE document_id = $1 OR id::text = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// ==========================================
// ========== MUHASEBE / FİNANSAL RAPORLAMA ==========
// ==========================================

app.get('/api/admin/finance/report', requireRole('superadmin', 'admin'), async (req: any, res) => {
  try {
    const period = (req.query.period as string) || 'monthly';
    const reqStart = req.query.startDate as string;
    const reqEnd = req.query.endDate as string;

    const nowDate = new Date();
    let startDate: Date;
    let endDate: Date = new Date(Date.UTC(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate(), 23, 59, 59, 999));

    if (period === 'custom' && reqStart) {
      const parseStart = new Date(reqStart);
      startDate = new Date(Date.UTC(parseStart.getFullYear(), parseStart.getMonth(), parseStart.getDate(), 0, 0, 0));
      if (reqEnd) {
        const parseEnd = new Date(reqEnd);
        endDate = new Date(Date.UTC(parseEnd.getFullYear(), parseEnd.getMonth(), parseEnd.getDate(), 23, 59, 59, 999));
      }
    } else {
      switch (period) {
        case 'today':
          startDate = new Date(Date.UTC(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate(), 0, 0, 0));
          break;
        case 'weekly':
          startDate = new Date(Date.UTC(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate() - 7, 0, 0, 0));
          break;
        case 'monthly':
          startDate = new Date(Date.UTC(nowDate.getFullYear(), nowDate.getMonth(), 1, 0, 0, 0));
          break;
        case 'semi-annual':
          startDate = new Date(Date.UTC(nowDate.getFullYear(), nowDate.getMonth() - 6, nowDate.getDate(), 0, 0, 0));
          break;
        case 'yearly':
          startDate = new Date(Date.UTC(nowDate.getFullYear(), 0, 1, 0, 0, 0));
          break;
        default:
          startDate = new Date(Date.UTC(nowDate.getFullYear(), nowDate.getMonth(), 1, 0, 0, 0));
      }
    }

    const startISO = startDate.toISOString();
    const endISO = endDate.toISOString();

    // === YARDIMCI FONKSİYONLAR (Merkezi, tek kaynak) ===

    // Gün hesaplama: kuruş/ondalık kaybı önlenmesi için tam gün
    function calcDays(startStr: string, endStr: string): number {
      if (!startStr || !endStr) return 0;
      const ms = new Date(endStr).getTime() - new Date(startStr).getTime();
      return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
    }

    // Tutar hesaplama: kuruş bazında yuvarlama (her işlem başına)
    function calcTotal(days: number, pricePerDay: string | number): number {
      const price = typeof pricePerDay === 'string' ? parseFloat(pricePerDay) : pricePerDay;
      if (!price || isNaN(price)) return 0;
      return Math.round(days * price * 100) / 100;
    }

    // Toplam gelir: her satır bağımsız yuvarlanır, toplam birikimsel hata önlenir
    function calcRevenue(rows: any[]): number {
      let total = 0;
      for (const r of rows) {
        if (!r.price_per_day || !r.start_date || !r.end_date) continue;
        total += calcTotal(calcDays(r.start_date, r.end_date), r.price_per_day);
      }
      return Math.round(total * 100) / 100;
    }

    // Erken teslim algılama
    function detectEarlyReturn(r: any): { isEarlyReturn: boolean; savedDays: number; refundAmount: number } {
      if (!r.original_end_date || !r.end_date || !r.price_per_day) {
        return { isEarlyReturn: false, savedDays: 0, refundAmount: 0 };
      }
      const planned = new Date(r.original_end_date).getTime();
      const actual = new Date(r.end_date).getTime();
      if (actual < planned) {
        const savedDays = Math.max(0, Math.ceil((planned - actual) / (1000 * 60 * 60 * 24)));
        return {
          isEarlyReturn: true,
          savedDays,
          refundAmount: calcTotal(savedDays, r.price_per_day),
        };
      }
      return { isEarlyReturn: false, savedDays: 0, refundAmount: 0 };
    }

    // === VERİ SORGULARI (DISTINCT ON ile mükerrer kayıt önleme) ===

    // Tamamlanan kiralamalar
    const completedRentals = await pool.query(
      `SELECT DISTINCT ON (r.id)
              r.id, r.document_id, r.start_date, r.end_date, r.original_end_date, r.requested_end_date,
              r.updated_at, r.created_at, r.pickup_office, r.dropoff_office,
              r.rental_status, r.payment_type,
              c.price_per_day, c.brand, c.model, c.id as car_id,
              u.first_name as user_first_name, u.last_name as user_last_name,
              u.email as user_email, u.username as user_username
       FROM rentals r
       LEFT JOIN rentals_car_lnk rcl ON rcl.rental_id = r.id
       LEFT JOIN cars c ON c.id = rcl.car_id
       LEFT JOIN rentals_user_lnk rul ON rul.rental_id = r.id
       LEFT JOIN up_users u ON u.id = rul.user_id
       WHERE r.rental_status != 'iptal' 
         AND (r.payment_status = 'paid' OR (r.rental_status = 'bitti' AND (r.payment_method IS NULL OR (r.payment_method != 'ofis' AND r.payment_method != 'office'))))
         AND r.updated_at >= $1 AND r.updated_at <= $2
       ORDER BY r.id, r.updated_at DESC`,
      [startISO, endISO]
    );

    // İptal edilen kiralamalar
    const cancelledRentals = await pool.query(
      `SELECT DISTINCT ON (r.id)
              r.id, r.document_id, r.start_date, r.end_date, r.original_end_date, r.requested_end_date,
              r.updated_at, r.created_at, r.pickup_office, r.dropoff_office,
              r.rental_status, r.payment_type,
              c.price_per_day, c.brand, c.model,
              u.first_name as user_first_name, u.last_name as user_last_name,
              u.email as user_email, u.username as user_username
       FROM rentals r
       LEFT JOIN rentals_car_lnk rcl ON rcl.rental_id = r.id
       LEFT JOIN cars c ON c.id = rcl.car_id
       LEFT JOIN rentals_user_lnk rul ON rul.rental_id = r.id
       LEFT JOIN up_users u ON u.id = rul.user_id
       WHERE r.rental_status = 'iptal' AND r.updated_at >= $1 AND r.updated_at <= $2
       ORDER BY r.id, r.updated_at DESC`,
      [startISO, endISO]
    );

    // === FİNANSAL HESAPLAMALAR ===

    const rentalGross = calcRevenue(completedRentals.rows);
    const rentalCancelled = calcRevenue(cancelledRentals.rows);
    const rentalCount = completedRentals.rows.length;
    const cancelledCount = cancelledRentals.rows.length;

    // Erken teslim toplamları
    let totalEarlyReturnRefund = 0;
    let earlyReturnCount = 0;
    for (const r of completedRentals.rows) {
      const earlyInfo = detectEarlyReturn(r);
      if (earlyInfo.isEarlyReturn) {
        totalEarlyReturnRefund += earlyInfo.refundAmount;
        earlyReturnCount++;
      }
    }
    totalEarlyReturnRefund = Math.round(totalEarlyReturnRefund * 100) / 100;

    // === E-TİCARET SİPARİŞLERİ ===
    const completedOrders = await pool.query(
      `SELECT o.*, si.title as item_title, si.platform as item_platform
       FROM shop_orders o
       LEFT JOIN shop_items si ON si.id = o.shop_item_id
       WHERE o.status = 'completed' AND o.created_at >= $1 AND o.created_at <= $2
       ORDER BY o.created_at DESC`,
      [startISO, endISO]
    );

    const cancelledOrders = await pool.query(
      `SELECT o.*, si.title as item_title, si.platform as item_platform
       FROM shop_orders o
       LEFT JOIN shop_items si ON si.id = o.shop_item_id
       WHERE o.status = 'cancelled' AND o.updated_at >= $1 AND o.updated_at <= $2
       ORDER BY o.created_at DESC`,
      [startISO, endISO]
    );

    // E-ticaret gelir hesabı
    let ecommerceGross = 0;
    for (const o of completedOrders.rows) {
      ecommerceGross += Math.round(parseFloat(o.total || 0) * 100) / 100;
    }
    ecommerceGross = Math.round(ecommerceGross * 100) / 100;

    let ecommerceCancelled = 0;
    for (const o of cancelledOrders.rows) {
      ecommerceCancelled += Math.round(parseFloat(o.total || 0) * 100) / 100;
    }
    ecommerceCancelled = Math.round(ecommerceCancelled * 100) / 100;

    // === BİRLEŞİK TOPLAM ===
    const grossRevenue = Math.round((rentalGross + ecommerceGross) * 100) / 100;
    const cancelledAmount = Math.round((rentalCancelled + ecommerceCancelled) * 100) / 100;
    const transactionCount = rentalCount + completedOrders.rows.length;

    // ★ NET GELİR = Brüt Gelir − İptal Tutarı − Erken Teslim İadeleri
    const netRevenue = Math.round((grossRevenue - cancelledAmount - totalEarlyReturnRefund) * 100) / 100;

    // Aktif kiralamalar (gelir tahmini)
    const activeRentals = await pool.query(
      `SELECT DISTINCT ON (r.id) r.id, r.start_date, r.end_date, c.price_per_day
       FROM rentals r
       LEFT JOIN rentals_car_lnk rcl ON rcl.rental_id = r.id
       LEFT JOIN cars c ON c.id = rcl.car_id
       WHERE r.rental_status = 'aktif'
       ORDER BY r.id`
    );
    const projectedRevenue = calcRevenue(activeRentals.rows);

    // === DAĞILIMLAR (merkezi calcDays/calcTotal kullanır) ===

    const carBreakdown: Record<string, { brand: string; model: string; revenue: number; count: number }> = {};
    for (const r of completedRentals.rows) {
      if (!r.car_id || !r.price_per_day) continue;
      const key = `${r.car_id}`;
      if (!carBreakdown[key]) {
        carBreakdown[key] = { brand: r.brand || '?', model: r.model || '?', revenue: 0, count: 0 };
      }
      carBreakdown[key].revenue += calcTotal(calcDays(r.start_date, r.end_date), r.price_per_day);
      carBreakdown[key].count += 1;
    }
    // Yuvarlama: her araç sonucunu ayrıca yuvarla
    for (const k of Object.keys(carBreakdown)) {
      carBreakdown[k].revenue = Math.round(carBreakdown[k].revenue * 100) / 100;
    }

    const officeBreakdown: Record<string, { name: string; revenue: number; count: number }> = {};
    for (const r of completedRentals.rows) {
      if (!r.pickup_office || !r.price_per_day) continue;
      const key = r.pickup_office;
      if (!officeBreakdown[key]) {
        officeBreakdown[key] = { name: key, revenue: 0, count: 0 };
      }
      officeBreakdown[key].revenue += calcTotal(calcDays(r.start_date, r.end_date), r.price_per_day);
      officeBreakdown[key].count += 1;
    }
    for (const k of Object.keys(officeBreakdown)) {
      officeBreakdown[k].revenue = Math.round(officeBreakdown[k].revenue * 100) / 100;
    }

    // Ofis isimlerini çöz
    for (const oId of Object.keys(officeBreakdown)) {
      const officeResult = await pool.query('SELECT name FROM offices WHERE id::text = $1 OR document_id = $1', [oId]);
      if (officeResult.rows.length > 0) {
        officeBreakdown[oId].name = officeResult.rows[0].name;
      }
    }

    // === DETAYLI İŞLEM DÖKÜMÜ ===

    function buildTransaction(r: any, status: 'completed' | 'cancelled') {
      const days = calcDays(r.start_date, r.end_date);
      const total = calcTotal(days, r.price_per_day);
      const earlyInfo = detectEarlyReturn(r);
      const customerName = [r.user_first_name, r.user_last_name].filter(Boolean).join(' ') || r.user_username || 'Bilinmeyen';

      return {
        id: r.id,
        documentId: r.document_id,
        transactionType: 'rental' as const,
        car: r.brand && r.model ? `${r.brand} ${r.model}` : 'Bilinmeyen Araç',
        customerName,
        customerEmail: r.user_email || '',
        paymentType: r.payment_type || 'Belirtilmemiş',
        startDate: r.start_date,
        endDate: r.end_date,
        requestedEndDate: r.original_end_date || r.requested_end_date || null,
        days,
        pricePerDay: Math.round(parseFloat(r.price_per_day || 0) * 100) / 100,
        total,
        status,
        rentalStatus: r.rental_status,
        isEarlyReturn: earlyInfo.isEarlyReturn,
        earlyReturnDays: earlyInfo.savedDays,
        refundAmount: earlyInfo.refundAmount,
        completedAt: r.updated_at,
      };
    }

    function buildOrderTransaction(o: any, status: 'completed' | 'cancelled') {
      return {
        id: o.id + 100000, // E-ticaret sipariş ID offset (collision önleme)
        documentId: `SHOP-${o.id}`,
        transactionType: 'product_sale' as const,
        car: o.item_title || 'E-Ticaret Ürünü',
        customerName: o.customer_name || 'Bilinmeyen',
        customerEmail: o.customer_email || '',
        paymentType: o.payment_type || 'Belirtilmemiş',
        startDate: null,
        endDate: null,
        requestedEndDate: null,
        days: o.quantity || 1,
        pricePerDay: Math.round(parseFloat(o.unit_price || 0) * 100) / 100,
        total: Math.round(parseFloat(o.total || 0) * 100) / 100,
        status,
        isEarlyReturn: false,
        earlyReturnDays: 0,
        refundAmount: status === 'cancelled' ? Math.round(parseFloat(o.total || 0) * 100) / 100 : 0,
        completedAt: o.updated_at || o.created_at,
      };
    }

    const completedTransactions = completedRentals.rows.map((r: any) => buildTransaction(r, 'completed'));
    const cancelledTransactions = cancelledRentals.rows.map((r: any) => buildTransaction(r, 'cancelled'));
    const completedOrderTxs = completedOrders.rows.map((o: any) => buildOrderTransaction(o, 'completed'));
    const cancelledOrderTxs = cancelledOrders.rows.map((o: any) => buildOrderTransaction(o, 'cancelled'));

    const allTransactions = [...completedTransactions, ...cancelledTransactions, ...completedOrderTxs, ...cancelledOrderTxs]
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

    res.json({
      period,
      startDate: startISO,
      endDate: endISO,
      summary: {
        grossRevenue,
        cancelledAmount: Math.round(cancelledAmount * 100) / 100,
        netRevenue,
        transactionCount,
        cancelledCount: cancelledCount + cancelledOrders.rows.length,
        projectedRevenue: Math.round(projectedRevenue * 100) / 100,
        activeRentalCount: activeRentals.rows.length,
        earlyReturnCount,
        totalEarlyReturnRefund,
        // Gelir kırılımı
        rentalGross,
        rentalCancelled,
        ecommerceGross,
        ecommerceCancelled,
        rentalCount,
        ecommerceCount: completedOrders.rows.length,
        ecommerceCancelledCount: cancelledOrders.rows.length,
      },
      carBreakdown: Object.values(carBreakdown).sort((a, b) => b.revenue - a.revenue),
      officeBreakdown: Object.values(officeBreakdown).sort((a, b) => b.revenue - a.revenue),
      allTransactions,
    });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// ==========================================
// ========== E-TİCARET / ALIŞVERİŞ ==========
// ==========================================

// Public: Aktif ürünleri listele
app.get('/api/shop/items', async (req, res) => {
  try {
    const platform = req.query.platform as string;
    const category = req.query.category as string;
    const sub_category = req.query.sub_category as string;
    const vehicle_brand = req.query.vehicle_brand as string;
    const vehicle_model = req.query.vehicle_model as string;

    let query = 'SELECT * FROM shop_items WHERE is_active = true';
    const params: any[] = [];

    if (platform && platform !== 'all') {
      params.push(platform);
      query += ` AND platform = $${params.length}`;
    }
    if (category && category !== 'all') {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }
    if (sub_category && sub_category !== 'all') {
      params.push(sub_category);
      query += ` AND sub_category = $${params.length}`;
    }
    if (vehicle_brand && vehicle_brand !== 'all') {
      params.push(vehicle_brand);
      query += ` AND vehicle_brand = $${params.length}`;
    }
    if (vehicle_model && vehicle_model !== 'all') {
      params.push(vehicle_model);
      query += ` AND vehicle_model = $${params.length}`;
    }

    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json({ data: result.rows });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Admin: Tüm ürünleri listele
app.get('/api/admin/shop/items', requireRole('superadmin', 'admin'), async (req: any, res) => {
  try {
    const result = await pool.query('SELECT * FROM shop_items ORDER BY created_at DESC');
    res.json({ data: result.rows });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Admin: Ürün ekle
app.post('/api/admin/shop/items', requireRole('superadmin', 'admin'), async (req: any, res) => {
  try {
    const { title, price, image_url, buy_link, platform, category, sub_category, vehicle_brand, vehicle_model, marketplace_id } = req.body;
    if (!title || !platform) return res.status(400).json({ error: { message: 'Başlık ve platform gerekli.' } });

    const result = await pool.query(
      `INSERT INTO shop_items (title, price, image_url, buy_link, platform, category, sub_category, vehicle_brand, vehicle_model, marketplace_id, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, NOW(), NOW()) RETURNING *`,
      [
        title, 
        price || 0, 
        image_url || '', 
        buy_link || '', 
        platform, 
        category || '', 
        sub_category || '', 
        vehicle_brand || '', 
        vehicle_model || '', 
        marketplace_id || ''
      ]
    );
    res.json({ data: result.rows[0] });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Admin: Ürün güncelle
app.put('/api/admin/shop/items/:id', requireRole('superadmin', 'admin'), async (req: any, res) => {
  try {
    const id = req.params.id;
    const { title, price, image_url, buy_link, platform, category, sub_category, vehicle_brand, vehicle_model, marketplace_id, is_active } = req.body;
    const sets: string[] = [];
    const vals: any[] = [];
    let idx = 1;

    if (title !== undefined) { sets.push(`title = $${idx}`); vals.push(title); idx++; }
    if (price !== undefined) { sets.push(`price = $${idx}`); vals.push(price); idx++; }
    if (image_url !== undefined) { sets.push(`image_url = $${idx}`); vals.push(image_url); idx++; }
    if (buy_link !== undefined) { sets.push(`buy_link = $${idx}`); vals.push(buy_link); idx++; }
    if (platform !== undefined) { sets.push(`platform = $${idx}`); vals.push(platform); idx++; }
    if (category !== undefined) { sets.push(`category = $${idx}`); vals.push(category); idx++; }
    if (sub_category !== undefined) { sets.push(`sub_category = $${idx}`); vals.push(sub_category); idx++; }
    if (vehicle_brand !== undefined) { sets.push(`vehicle_brand = $${idx}`); vals.push(vehicle_brand); idx++; }
    if (vehicle_model !== undefined) { sets.push(`vehicle_model = $${idx}`); vals.push(vehicle_model); idx++; }
    if (marketplace_id !== undefined) { sets.push(`marketplace_id = $${idx}`); vals.push(marketplace_id); idx++; }
    if (is_active !== undefined) { sets.push(`is_active = $${idx}`); vals.push(is_active); idx++; }

    if (sets.length === 0) return res.status(400).json({ error: { message: 'Güncellenecek alan yok.' } });

    sets.push(`updated_at = NOW()`);
    vals.push(id);
    await pool.query(`UPDATE shop_items SET ${sets.join(', ')} WHERE id = $${idx}`, vals);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Admin: Ürün sil
app.delete('/api/admin/shop/items/:id', requireRole('superadmin', 'admin'), async (req: any, res) => {
  try {
    await pool.query('DELETE FROM shop_items WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Admin: Pazaryeri ayarları getir
app.get('/api/admin/shop/settings', requireRole('superadmin', 'admin'), async (req: any, res) => {
  try {
    const result = await pool.query('SELECT * FROM marketplace_settings ORDER BY platform');
    res.json({ data: result.rows });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Admin: Pazaryeri ayarı güncelle/oluştur
app.put('/api/admin/shop/settings', requireRole('superadmin', 'admin'), async (req: any, res) => {
  try {
    const { platform, api_key, api_secret, seller_id, store_url, is_enabled } = req.body;
    if (!platform) return res.status(400).json({ error: { message: 'Platform gerekli.' } });

    await pool.query(
      `INSERT INTO marketplace_settings (platform, api_key, api_secret, seller_id, store_url, is_enabled, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (platform) DO UPDATE SET
         api_key = COALESCE($2, marketplace_settings.api_key),
         api_secret = COALESCE($3, marketplace_settings.api_secret),
         seller_id = COALESCE($4, marketplace_settings.seller_id),
         store_url = COALESCE($5, marketplace_settings.store_url),
         is_enabled = COALESCE($6, marketplace_settings.is_enabled),
         updated_at = NOW()`,
      [platform, api_key || null, api_secret || null, seller_id || null, store_url || null, is_enabled ?? false]
    );
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Admin: Senkronizasyon (şimdilik stub — API anahtarları gelince aktifleşecek)
app.post('/api/admin/shop/sync', requireRole('superadmin', 'admin'), async (req: any, res) => {
  try {
    // Pazaryeri ayarlarını kontrol et
    const settings = await pool.query('SELECT * FROM marketplace_settings WHERE is_enabled = true');
    if (settings.rows.length === 0) {
      return res.json({
        ok: false,
        message: 'Aktif pazaryeri entegrasyonu bulunamadı. Lütfen önce Pazaryeri Ayarları bölümünden API anahtarlarınızı girin.',
        synced: 0
      });
    }

    // TODO: Trendyol/HB/N11 API entegrasyonu buraya eklenecek
    // Şimdilik bilgilendirme mesajı döner
    const platforms = settings.rows.map((s: any) => s.platform).join(', ');
    res.json({
      ok: true,
      message: `API entegrasyonu henüz aktif değil. Aktif platformlar: ${platforms}. API anahtarları doğrulandığında otomatik senkronizasyon başlayacaktır.`,
      synced: 0
    });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Public: Kategorileri listele
app.get('/api/shop/categories', async (req, res) => {
  try {
    const result = await pool.query("SELECT DISTINCT category FROM shop_items WHERE is_active = true AND category != '' AND category IS NOT NULL ORDER BY category");
    res.json({ data: result.rows.map((r: any) => r.category) });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// ==========================================
// ========== E-TİCARET SİPARİŞLERİ ==========
// ==========================================

// Admin: Sipariş oluştur (manuel satış kaydı)
app.post('/api/admin/shop/orders', requireRole('superadmin', 'admin'), async (req: any, res) => {
  try {
    const { shop_item_id, customer_name, customer_email, quantity, payment_type, notes } = req.body;
    if (!customer_name) return res.status(400).json({ error: { message: 'Müşteri adı gerekli.' } });

    const q = Math.max(1, parseInt(quantity) || 1); // Eksi miktar engellemesi
    let finalUnitPrice = parseFloat(req.body.unit_price) || 0;

    // İş mantığı: Eğer shop_item_id varsa, fiyatı veritabanından alıp frontend'den geleni eziyoruz!
    if (shop_item_id) {
      const itemResult = await pool.query('SELECT price FROM shop_items WHERE id = $1', [shop_item_id]);
      if (itemResult.rows.length > 0) {
        finalUnitPrice = parseFloat(itemResult.rows[0].price) || 0;
      }
    }

    if (finalUnitPrice < 0) return res.status(400).json({ error: { message: 'Fiyat negatif olamaz.' } });

    const total = Math.round(q * finalUnitPrice * 100) / 100;
    const result = await pool.query(
      `INSERT INTO shop_orders (shop_item_id, customer_name, customer_email, quantity, unit_price, total, payment_type, notes, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'completed', NOW(), NOW()) RETURNING *`,
      [shop_item_id || null, customer_name, customer_email || '', q, finalUnitPrice, total, payment_type || 'Belirtilmemiş', notes || '']
    );
    res.json({ data: result.rows[0] });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Admin: Siparişleri listele
app.get('/api/admin/shop/orders', requireRole('superadmin', 'admin'), async (req: any, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*, si.title as item_title, si.platform as item_platform
       FROM shop_orders o
       LEFT JOIN shop_items si ON si.id = o.shop_item_id
       ORDER BY o.created_at DESC`
    );
    res.json({ data: result.rows });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Admin: Sipariş iptal et / iade
app.put('/api/admin/shop/orders/:id/cancel', requireRole('superadmin', 'admin'), async (req: any, res) => {
  try {
    await pool.query(
      `UPDATE shop_orders SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
      [req.params.id]
    );
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// ==========================================
// ========== RENTALS LIST (Strapi compat) ==========
// ==========================================
app.get('/api/rentals', async (req, res) => {
  try {
    let query = 'SELECT * FROM rentals WHERE 1=1';
    const filters = req.query?.filters as any;
    if (filters?.rentalStatus?.$notIn) {
      const notIn = Object.values(filters.rentalStatus.$notIn);
      const placeholders = notIn.map((_, i) => `$${i + 1}`).join(', ');
      query += ` AND rental_status NOT IN (${placeholders})`;
      const result = await pool.query(query + ' ORDER BY created_at DESC', notIn);
      const formatted = await Promise.all(result.rows.map(formatRental));
      return res.json({ data: formatted });
    }
    const result = await pool.query(query + ' ORDER BY created_at DESC');
    const formatted = await Promise.all(result.rows.map(formatRental));
    res.json({ data: formatted });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// ==========================================
// ========== LEADS ==========
// ==========================================

app.post('/api/leads', async (req, res) => {
  try {
    const d = req.body.data;
    const docId = genDocId();
    await pool.query(
      `INSERT INTO leads (document_id, name, email, phone, message, source, created_at, updated_at, published_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$7,$7)`,
      [docId, d.name, d.email, d.phone || null, d.message || null, d.source || null, now()]
    );
    res.json({ data: { id: docId } });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// ========== PROJECTS (eski route kaldırıldı — güncel route aşağıda PROJELERİMİZ bölümünde) ==========

// ==========================================
// ========== KULLANICI YÖNETİMİ ==========
// ==========================================

// Tüm kullanıcıları listele
app.get('/api/admin/users', requireRole('superadmin', 'admin'), async (req: any, res) => {
  try {

    const users = await pool.query(`
      SELECT u.*, r.name as role_name, r.type as role_type
      FROM up_users u
      LEFT JOIN up_users_role_lnk url ON url.user_id = u.id
      LEFT JOIN up_roles r ON r.id = url.role_id
      ORDER BY u.created_at DESC
    `);

    const data = users.rows.map(u => ({
      id: u.id,
      documentId: u.document_id,
      username: u.username,
      email: u.email,
      firstName: u.first_name,
      lastName: u.last_name,
      provider: u.provider,
      googleId: u.google_id || null,
      confirmed: u.confirmed,
      blocked: u.blocked,
      role: u.role_name || 'Authenticated',
      roleType: u.role_type || 'authenticated',
      phoneNumber: u.phone_number || null,
      createdAt: u.created_at,
      updatedAt: u.updated_at,
    }));
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Kullanıcı güncelle (rol, engelle/aç)
app.put('/api/admin/users/:id', requireRole('superadmin', 'admin'), async (req: any, res) => {
  try {

    const { blocked, roleId, firstName, lastName, phoneNumber } = req.body;
    const userId = req.params.id;

    if (phoneNumber) {
      const phoneRegex = /^[0-9\+\-\(\)\s]+$/;
      if (!phoneRegex.test(phoneNumber)) {
        return res.status(400).json({ error: { message: 'Geçersiz telefon numarası formatı.' } });
      }
    }

    const sets: string[] = ['updated_at = $1'];
    const vals: any[] = [now()];
    let idx = 2;

    if (blocked !== undefined) { sets.push(`blocked = $${idx}`); vals.push(blocked); idx++; }
    if (firstName !== undefined) { sets.push(`first_name = $${idx}`); vals.push(firstName); idx++; }
    if (lastName !== undefined) { sets.push(`last_name = $${idx}`); vals.push(lastName); idx++; }
    if (phoneNumber !== undefined) { sets.push(`phone_number = $${idx}`); vals.push(phoneNumber); idx++; }

    vals.push(userId);
    await pool.query(`UPDATE up_users SET ${sets.join(', ')} WHERE document_id = $${idx} OR id::text = $${idx}`, vals);

    // Rol güncelleme (ayrı link tablosu)
    if (roleId) {
      // Önce user'ın gerçek id'sini bul
      const userResult = await pool.query('SELECT id FROM up_users WHERE document_id = $1 OR id::text = $1', [userId]);
      if (userResult.rows.length > 0) {
        const realUserId = userResult.rows[0].id;
        await pool.query('DELETE FROM up_users_role_lnk WHERE user_id = $1', [realUserId]);
        await pool.query('INSERT INTO up_users_role_lnk (user_id, role_id) VALUES ($1, $2)', [realUserId, roleId]);
      }
    }

    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Kullanıcı sil
app.delete('/api/admin/users/:id', requireRole('superadmin', 'admin'), async (req: any, res) => {
  try {

    // Önce user'ın gerçek id'sini bul
    const userResult = await pool.query('SELECT id FROM up_users WHERE document_id = $1 OR id::text = $1', [req.params.id]);
    if (userResult.rows.length > 0) {
      const realUserId = userResult.rows[0].id;
      // Link tablolarını temizle
      await pool.query('DELETE FROM up_users_role_lnk WHERE user_id = $1', [realUserId]);
      await pool.query('DELETE FROM rentals_user_lnk WHERE user_id = $1', [realUserId]);
      // Kullanıcıyı sil
      await pool.query('DELETE FROM up_users WHERE id = $1', [realUserId]);
    }

    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// ==========================================
// ========== ROL & İZİN YÖNETİMİ ==========
// ==========================================

// Rolleri listele (izinleri ile birlikte)
app.get('/api/admin/roles', requireRole('superadmin', 'admin'), async (req: any, res) => {
  try {

    const roles = await pool.query('SELECT * FROM up_roles ORDER BY id');

    const data = await Promise.all(roles.rows.map(async (r: any) => {
      const countResult = await pool.query('SELECT COUNT(*) FROM up_users_role_lnk WHERE role_id = $1', [r.id]);

      // Rolün izinlerini çek
      const permsResult = await pool.query(`
        SELECT p.id, p.action FROM up_permissions p
        JOIN up_permissions_role_lnk prl ON prl.permission_id = p.id
        WHERE prl.role_id = $1 ORDER BY p.action
      `, [r.id]);

      return {
        id: r.id,
        documentId: r.document_id,
        name: r.name,
        description: r.description,
        type: r.type,
        userCount: parseInt(countResult.rows[0].count),
        permissions: permsResult.rows.map(p => ({ id: p.id, action: p.action })),
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      };
    }));

    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Tek rol detayı (izinleri ile)
app.get('/api/admin/roles/:id', requireRole('superadmin', 'admin'), async (req: any, res) => {
  try {

    const roleResult = await pool.query('SELECT * FROM up_roles WHERE id = $1', [req.params.id]);
    if (roleResult.rows.length === 0) return res.status(404).json({ error: { message: 'Rol bulunamadı.' } });
    const r = roleResult.rows[0];

    const countResult = await pool.query('SELECT COUNT(*) FROM up_users_role_lnk WHERE role_id = $1', [r.id]);
    const permsResult = await pool.query(`
      SELECT p.id, p.action FROM up_permissions p
      JOIN up_permissions_role_lnk prl ON prl.permission_id = p.id
      WHERE prl.role_id = $1 ORDER BY p.action
    `, [r.id]);

    // Bu role atanmış kullanıcıları da getir
    const usersResult = await pool.query(`
      SELECT u.id, u.document_id, u.username, u.email, u.first_name, u.last_name
      FROM up_users u
      JOIN up_users_role_lnk url ON url.user_id = u.id
      WHERE url.role_id = $1
      ORDER BY u.created_at DESC
    `, [r.id]);

    res.json({
      id: r.id,
      documentId: r.document_id,
      name: r.name,
      description: r.description,
      type: r.type,
      userCount: parseInt(countResult.rows[0].count),
      permissions: permsResult.rows.map(p => ({ id: p.id, action: p.action })),
      users: usersResult.rows.map(u => ({
        id: u.id, documentId: u.document_id, username: u.username,
        email: u.email, firstName: u.first_name, lastName: u.last_name,
      })),
    });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Tüm mevcut izinleri listele (gruplu)
app.get('/api/admin/permissions', requireRole('superadmin'), async (req: any, res) => {
  try {

    const perms = await pool.query('SELECT DISTINCT action FROM up_permissions ORDER BY action');

    // İzinleri gruplara ayır
    const grouped: Record<string, string[]> = {};
    for (const p of perms.rows) {
      // action format: "api::car.car.find" → group: "car", action: "find"
      const parts = p.action.split('.');
      let group = 'Diğer';
      if (p.action.startsWith('api::')) {
        group = parts[0]?.replace('api::', '') || 'Diğer';
      } else if (p.action.startsWith('plugin::')) {
        group = parts[0]?.replace('plugin::', 'plugin_') || 'Plugin';
      }
      if (!grouped[group]) grouped[group] = [];
      grouped[group].push(p.action);
    }

    res.json({ actions: perms.rows.map(p => p.action), grouped });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Rol oluştur
app.post('/api/admin/roles', requireRole('superadmin'), async (req: any, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: { message: 'Rol adı gerekli.' } });

    const docId = genDocId();
    const type = name.toLowerCase().replace(/[^a-z0-9_]/g, '_');

    const result = await pool.query(
      `INSERT INTO up_roles (document_id, name, description, type, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $5) RETURNING *`,
      [docId, name, description || '', type, now()]
    );

    res.json({ ok: true, role: result.rows[0] });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Rol güncelle (ad, açıklama)
app.put('/api/admin/roles/:id', requireRole('superadmin'), async (req: any, res) => {
  try {
    const { name, description } = req.body;
    const sets: string[] = ['updated_at = $1'];
    const vals: any[] = [now()];
    let idx = 2;

    if (name) { sets.push(`name = $${idx}`); vals.push(name); idx++; }
    if (description !== undefined) { sets.push(`description = $${idx}`); vals.push(description); idx++; }

    vals.push(req.params.id);
    await pool.query(`UPDATE up_roles SET ${sets.join(', ')} WHERE id = $${idx}`, vals);

    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Rol sil
app.delete('/api/admin/roles/:id', requireRole('superadmin'), async (req: any, res) => {
  try {
    const roleId = parseInt(req.params.id);

    // Varsayılan rolleri silmeyi engelle
    const roleResult = await pool.query('SELECT type FROM up_roles WHERE id = $1', [roleId]);
    if (roleResult.rows.length > 0 && ['authenticated', 'public'].includes(roleResult.rows[0].type)) {
      return res.status(400).json({ error: { message: 'Varsayılan roller silinemez.' } });
    }

    // İzin bağlantılarını temizle
    await pool.query('DELETE FROM up_permissions_role_lnk WHERE role_id = $1', [roleId]);
    // Kullanıcı bağlantılarını temizle
    await pool.query('DELETE FROM up_users_role_lnk WHERE role_id = $1', [roleId]);
    // Rolü sil
    await pool.query('DELETE FROM up_roles WHERE id = $1', [roleId]);

    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Rol izinlerini toplu güncelle
app.post('/api/admin/roles/:id/permissions', requireRole('superadmin'), async (req: any, res) => {
  try {
    const roleId = parseInt(req.params.id);
    const { actions } = req.body; // string[] — aktif olması gereken action listesi

    if (!Array.isArray(actions)) return res.status(400).json({ error: { message: 'actions dizisi gerekli.' } });

    // Mevcut izin bağlantılarını sil
    await pool.query('DELETE FROM up_permissions_role_lnk WHERE role_id = $1', [roleId]);

    // Her action için izin kaydı bul veya oluştur, sonra bağla
    for (const action of actions) {
      let permResult = await pool.query('SELECT id FROM up_permissions WHERE action = $1', [action]);
      let permId: number;

      if (permResult.rows.length === 0) {
        // İzin yoksa oluştur
        const docId = genDocId();
        const newPerm = await pool.query(
          'INSERT INTO up_permissions (document_id, action, created_at, updated_at) VALUES ($1, $2, $3, $3) RETURNING id',
          [docId, action, now()]
        );
        permId = newPerm.rows[0].id;
      } else {
        permId = permResult.rows[0].id;
      }

      await pool.query('INSERT INTO up_permissions_role_lnk (permission_id, role_id) VALUES ($1, $2)', [permId, roleId]);
    }

    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Kullanıcıları role toplu ata
app.post('/api/admin/roles/:id/users', requireRole('superadmin'), async (req: any, res) => {
  try {
    const roleId = parseInt(req.params.id);
    const { userIds } = req.body; // number[] — user id listesi

    if (!Array.isArray(userIds)) return res.status(400).json({ error: { message: 'userIds dizisi gerekli.' } });

    for (const userId of userIds) {
      // Önce mevcut rolünü kaldır
      await pool.query('DELETE FROM up_users_role_lnk WHERE user_id = $1', [userId]);
      // Yeni rolü ata
      await pool.query('INSERT INTO up_users_role_lnk (user_id, role_id) VALUES ($1, $2)', [userId, roleId]);
    }

    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// ==========================================
// ========== MEDYA YÖNETİMİ ==========
// ==========================================

// Medya dosyalarını listele
app.get('/api/admin/media', requireRole('superadmin', 'admin', 'editor'), async (req: any, res) => {
  try {

    const files = await pool.query(`
      SELECT f.*, frm.related_type, frm.field, frm.related_id
      FROM files f
      LEFT JOIN files_related_mph frm ON frm.file_id = f.id
      ORDER BY f.created_at DESC
    `);

    const groupedFiles = new Map<number, any>();

    for (const f of files.rows) {
      if (!groupedFiles.has(f.id)) {
        groupedFiles.set(f.id, {
          id: f.id,
          documentId: f.document_id,
          name: f.name,
          alternativeText: f.alternative_text,
          caption: f.caption,
          width: f.width,
          height: f.height,
          ext: f.ext,
          mime: f.mime,
          size: f.size,
          url: f.url,
          relatedType: f.related_type || null,
          relatedField: f.field || null,
          relatedId: f.related_id || null,
          createdAt: f.created_at,
          relations: [],
        });
      }

      const file = groupedFiles.get(f.id);
      if (f.related_type || f.field || f.related_id) {
        file.relations.push({
          type: f.related_type || null,
          field: f.field || null,
          id: f.related_id || null,
        });
      }
    }

    const data = Array.from(groupedFiles.values()).map((file) => ({
      ...file,
      relatedCount: file.relations.length,
      relatedTypes: Array.from(new Set(file.relations.map((relation: any) => relation.type).filter(Boolean))),
    }));

    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Medya dosyası sil
app.delete('/api/admin/media/:id', requireRole('superadmin', 'admin', 'editor'), async (req: any, res) => {
  try {

    // Dosya bilgisini al
    const fileResult = await pool.query('SELECT * FROM files WHERE id = $1', [req.params.id]);
    if (fileResult.rows.length === 0) return res.status(404).json({ error: { message: 'Dosya bulunamadı.' } });

    const file = fileResult.rows[0];

    // İlişkileri temizle
    await pool.query('DELETE FROM files_related_mph WHERE file_id = $1', [file.id]);
    // Dosya kaydını sil
    await pool.query('DELETE FROM files WHERE id = $1', [file.id]);

    // Fiziksel dosyayı silmeyi dene (hata verirse sessiz geç)
    try {
      const fs = await import('fs');
      const filePath = path.join(__dirname, '../public', file.url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch { }

    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Medya dosyası yükle (multipart/form-data)
app.post('/api/admin/media/upload', requireRole('superadmin', 'admin', 'editor'), async (req: any, res) => {
  try {
    // Basit buffer okuma (multer yerine)
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', async () => {
      try {
        const body = Buffer.concat(chunks);
        const contentType = req.headers['content-type'] || '';

        // Boundary bul
        const boundaryMatch = contentType.match(/boundary=(.+)/);
        if (!boundaryMatch) return res.status(400).json({ error: { message: 'Geçersiz form verisi.' } });

        const boundary = boundaryMatch[1];
        const parts = body.toString('binary').split(`--${boundary}`);

        let fileName = 'upload';
        let fileBuffer: Buffer | null = null;
        let fileMime = 'application/octet-stream';
        let relatedType = '';
        let relatedId = '';
        let field = '';
        let secret = '';

        for (const part of parts) {
          if (part.includes('Content-Disposition')) {
            const nameMatch = part.match(/name="([^"]+)"/);
            const filenameMatch = part.match(/filename="([^"]+)"/);
            const contentTypeMatch = part.match(/Content-Type: (.+)\r\n/);

            // Header ve body arasındaki boş satırı bul
            const headerEnd = part.indexOf('\r\n\r\n');
            if (headerEnd === -1) continue;
            const partBody = part.slice(headerEnd + 4).replace(/\r\n$/, '');

            if (filenameMatch) {
              fileName = filenameMatch[1];
              if (contentTypeMatch) fileMime = contentTypeMatch[1].trim();
              fileBuffer = Buffer.from(partBody, 'binary');
            } else if (nameMatch) {
              const val = partBody.trim();
              if (nameMatch[1] === 'relatedType') relatedType = val;
              else if (nameMatch[1] === 'relatedId') relatedId = val;
              else if (nameMatch[1] === 'field') field = val;
              else if (nameMatch[1] === 'secret') secret = val;
            }
          }
        }

        if (!fileBuffer) return res.status(400).json({ error: { message: 'Dosya bulunamadı.' } });

        // Dosya adını güvenli hale getir
        const ext = path.extname(fileName);
        const hash = crypto.randomBytes(8).toString('hex');
        const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storedName = `${path.basename(safeName, ext)}_${hash}${ext}`;

        // Dosyayı kaydet
        const fs = await import('fs');
        const uploadDir = path.join(__dirname, '../public/uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        fs.writeFileSync(path.join(uploadDir, storedName), fileBuffer);

        // Veritabanına kaydet
        const docId = genDocId();
        const fileSize = (fileBuffer.length / 1024).toFixed(2);
        const fileResult = await pool.query(
          `INSERT INTO files (document_id, name, hash, ext, mime, size, url, provider, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'local', $8, $8) RETURNING *`,
          [docId, safeName, hash, ext, fileMime, fileSize, `/uploads/${storedName}`, now()]
        );

        // İlişki kur
        if (relatedType && relatedId && field) {
          await pool.query(
            `INSERT INTO files_related_mph (file_id, related_id, related_type, field, "order")
             VALUES ($1, $2, $3, $4, 1)`,
            [fileResult.rows[0].id, parseInt(relatedId), relatedType, field]
          );
        }

        res.json({
          id: fileResult.rows[0].id,
          url: `/uploads/${storedName}`,
          name: safeName,
        });
      } catch (e: any) {
        res.status(500).json({ error: { message: e.message } });
      }
    });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Tablo oluşturma ve güncellemeler (başlangıçta otomatik)
async function ensureTables() {
  // User & Role Tables
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

  // Files & Media Tables
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
      [genDocId(), 'Authenticated', 'Default role for registered users', 'authenticated', now()]
    );
  }

  const publicRole = await pool.query("SELECT id FROM up_roles WHERE type = 'public'");
  if (publicRole.rows.length === 0) {
    await pool.query(
      "INSERT INTO up_roles (document_id, name, description, type, created_at, updated_at, published_at) VALUES ($1, $2, $3, $4, $5, $5, $5)",
      [genDocId(), 'Public', 'Default role for non-authenticated users', 'public', now()]
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

  // Cars current_office_id ekleme
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

  // Admin Users tablosu (RBAC)
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
ensureTables().catch(console.error);

// Anasayfa medyalarını listele (public - frontend için)
app.get('/api/homepage-media', async (req, res) => {
  try {
    const onlyActive = req.query.active === 'true';
    let query = 'SELECT * FROM homepage_media';
    if (onlyActive) query += ' WHERE is_active = true';
    query += ' ORDER BY sort_order ASC, created_at DESC';
    const result = await pool.query(query);
    const data = result.rows.map(r => ({
      id: r.id,
      documentId: r.document_id,
      title: r.title,
      description: r.description,
      mediaType: r.media_type,
      mediaUrl: r.media_url,
      thumbnailUrl: r.thumbnail_url,
      sortOrder: r.sort_order,
      isActive: r.is_active,
      createdAt: r.created_at,
    }));
    res.json({ data });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Admin: medya ekle
app.post('/api/admin/homepage-media', requireRole('superadmin', 'admin', 'editor'), async (req: any, res) => {
  try {
    const { title, description, mediaType, mediaUrl, thumbnailUrl, sortOrder } = req.body;
    if (!mediaUrl || !mediaType) return res.status(400).json({ error: { message: 'mediaUrl ve mediaType gerekli.' } });

    const docId = genDocId();
    const result = await pool.query(
      `INSERT INTO homepage_media (document_id, title, description, media_type, media_url, thumbnail_url, sort_order, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $8) RETURNING *`,
      [docId, title || '', description || '', mediaType, mediaUrl, thumbnailUrl || '', sortOrder || 0, now()]
    );
    res.json({ ok: true, data: result.rows[0] });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Admin: medya güncelle
app.put('/api/admin/homepage-media/:id', requireRole('superadmin', 'admin', 'editor'), async (req: any, res) => {
  try {
    const { title, description, mediaType, mediaUrl, thumbnailUrl, sortOrder, isActive } = req.body;

    const sets: string[] = ['updated_at = $1'];
    const vals: any[] = [now()];
    let idx = 2;

    if (title !== undefined) { sets.push(`title = $${idx}`); vals.push(title); idx++; }
    if (description !== undefined) { sets.push(`description = $${idx}`); vals.push(description); idx++; }
    if (mediaType !== undefined) { sets.push(`media_type = $${idx}`); vals.push(mediaType); idx++; }
    if (mediaUrl !== undefined) { sets.push(`media_url = $${idx}`); vals.push(mediaUrl); idx++; }
    if (thumbnailUrl !== undefined) { sets.push(`thumbnail_url = $${idx}`); vals.push(thumbnailUrl); idx++; }
    if (sortOrder !== undefined) { sets.push(`sort_order = $${idx}`); vals.push(sortOrder); idx++; }
    if (isActive !== undefined) { sets.push(`is_active = $${idx}`); vals.push(isActive); idx++; }

    vals.push(req.params.id);
    await pool.query(`UPDATE homepage_media SET ${sets.join(', ')} WHERE id = $${idx} OR document_id = $${idx}::text`, vals);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Admin: medya sil
app.delete('/api/admin/homepage-media/:id', requireRole('superadmin', 'admin', 'editor'), async (req: any, res) => {
  try {
    await pool.query('DELETE FROM homepage_media WHERE id = $1 OR document_id = $1::text', [req.params.id]);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// ==========================================
// ========== PROJELERİMİZ ==========
// ==========================================

// Public: Aktif projeleri listele
app.get('/api/projects', async (req, res) => {
  try {
    const onlyActive = req.query.active === 'true';
    let query = 'SELECT * FROM projects';
    if (onlyActive) query += ' WHERE is_active = true';
    query += ' ORDER BY sort_order ASC, created_at DESC';
    const result = await pool.query(query);
    const data = result.rows.map(r => ({
      id: r.id,
      documentId: r.document_id,
      title: r.title,
      description: r.description,
      category: r.category,
      mediaType: r.media_type,
      mediaUrl: r.media_url,
      thumbnailUrl: r.thumbnail_url,
      sortOrder: r.sort_order,
      isActive: r.is_active,
      createdAt: r.created_at,
    }));
    res.json({ data });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Admin: Proje ekle
app.post('/api/admin/projects', requireRole('superadmin', 'admin', 'editor'), async (req: any, res) => {
  try {
    const { title, description, category, mediaType, mediaUrl, thumbnailUrl, sortOrder } = req.body;
    if (!title) return res.status(400).json({ error: { message: 'Proje başlığı gerekli.' } });

    const docId = genDocId();
    const result = await pool.query(
      `INSERT INTO projects (document_id, title, description, category, media_type, media_url, thumbnail_url, sort_order, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9, $9) RETURNING *`,
      [docId, title, description || '', category || 'Genel', mediaType || 'image', mediaUrl || '', thumbnailUrl || '', sortOrder || 0, now()]
    );
    res.json({ ok: true, data: result.rows[0] });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Admin: Proje güncelle
app.put('/api/admin/projects/:id', requireRole('superadmin', 'admin', 'editor'), async (req: any, res) => {
  try {
    const { title, description, category, mediaType, mediaUrl, thumbnailUrl, sortOrder, isActive } = req.body;

    const sets: string[] = ['updated_at = $1'];
    const vals: any[] = [now()];
    let idx = 2;

    if (title !== undefined) { sets.push(`title = $${idx}`); vals.push(title); idx++; }
    if (description !== undefined) { sets.push(`description = $${idx}`); vals.push(description); idx++; }
    if (category !== undefined) { sets.push(`category = $${idx}`); vals.push(category); idx++; }
    if (mediaType !== undefined) { sets.push(`media_type = $${idx}`); vals.push(mediaType); idx++; }
    if (mediaUrl !== undefined) { sets.push(`media_url = $${idx}`); vals.push(mediaUrl); idx++; }
    if (thumbnailUrl !== undefined) { sets.push(`thumbnail_url = $${idx}`); vals.push(thumbnailUrl); idx++; }
    if (sortOrder !== undefined) { sets.push(`sort_order = $${idx}`); vals.push(sortOrder); idx++; }
    if (isActive !== undefined) { sets.push(`is_active = $${idx}`); vals.push(isActive); idx++; }

    vals.push(req.params.id);
    await pool.query(`UPDATE projects SET ${sets.join(', ')} WHERE id = $${idx} OR document_id = $${idx}::text`, vals);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Admin: Proje dosyası yükle (ayrı upload — medya havuzuna KAYDETMEZ)
app.post('/api/admin/projects/upload', requireRole('superadmin', 'admin', 'editor'), async (req: any, res) => {
  try {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', async () => {
      try {
        const body = Buffer.concat(chunks);
        const contentType = req.headers['content-type'] || '';

        const boundaryMatch = contentType.match(/boundary=(.+)/);
        if (!boundaryMatch) return res.status(400).json({ error: { message: 'Geçersiz form verisi.' } });

        const boundary = boundaryMatch[1];
        const parts = body.toString('binary').split(`--${boundary}`);

        let fileName = 'upload';
        let fileBuffer: Buffer | null = null;
        let fileMime = 'application/octet-stream';

        for (const part of parts) {
          if (part.includes('Content-Disposition')) {
            const filenameMatch = part.match(/filename="([^"]+)"/);
            const contentTypeMatch = part.match(/Content-Type: (.+)\r\n/);

            const headerEnd = part.indexOf('\r\n\r\n');
            if (headerEnd === -1) continue;
            const partBody = part.slice(headerEnd + 4).replace(/\r\n$/, '');

            if (filenameMatch) {
              fileName = filenameMatch[1];
              if (contentTypeMatch) fileMime = contentTypeMatch[1].trim();
              fileBuffer = Buffer.from(partBody, 'binary');
            }
          }
        }

        if (!fileBuffer) return res.status(400).json({ error: { message: 'Dosya bulunamadı.' } });

        const ext = path.extname(fileName);
        const hash = crypto.randomBytes(8).toString('hex');
        const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storedName = `${path.basename(safeName, ext)}_${hash}${ext}`;

        // Projelere özel dizin
        const fsModule = await import('fs');
        const uploadDir = path.join(__dirname, '../public/uploads/projects');
        if (!fsModule.existsSync(uploadDir)) fsModule.mkdirSync(uploadDir, { recursive: true });
        fsModule.writeFileSync(path.join(uploadDir, storedName), fileBuffer);

        // files tablosuna KAYDETME — sadece URL döndür
        res.json({
          url: `/uploads/projects/${storedName}`,
          name: safeName,
        });
      } catch (e: any) {
        res.status(500).json({ error: { message: e.message } });
      }
    });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Admin: Proje sil
app.delete('/api/admin/projects/:id', requireRole('superadmin', 'admin', 'editor'), async (req: any, res) => {
  try {
    await pool.query('DELETE FROM projects WHERE id = $1 OR document_id = $1::text', [req.params.id]);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// ==========================================
// ========== ADMIN AUTH & USER MANAGEMENT ==========
// ==========================================

// Admin Login
app.post('/api/admin/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: { message: 'E-posta ve şifre gerekli.' } });

    const result = await pool.query('SELECT * FROM admin_users WHERE email = $1 AND is_active = true', [email]);
    if (result.rows.length === 0) return res.status(401).json({ error: { message: 'E-posta veya şifre hatalı.' } });

    const admin = result.rows[0];
    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) return res.status(401).json({ error: { message: 'E-posta veya şifre hatalı.' } });

    const token = signAdminToken(admin);
    res.json({
      jwt: token,
      admin: {
        id: admin.id,
        documentId: admin.document_id,
        email: admin.email,
        firstName: admin.first_name,
        lastName: admin.last_name,
        role: admin.role,
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Admin Me (token inspection)
app.get('/api/admin/auth/me', adminAuthMiddleware, (req: any, res) => {
  res.json({
    admin: {
      id: req.admin.adminId,
      documentId: req.admin.documentId,
      email: req.admin.email,
      firstName: req.admin.firstName,
      lastName: req.admin.lastName,
      role: req.admin.role,
    },
  });
});

// Admin User CRUD (superadmin + admin, superadmin stays immutable)
app.get('/api/admin/panel/users', requireRole('superadmin', 'admin'), async (req: any, res) => {
  try {
    const result = await pool.query('SELECT id, document_id, first_name, last_name, email, role, is_active, created_at FROM admin_users ORDER BY id');
    res.json(result.rows.map(r => ({
      id: r.id, documentId: r.document_id, firstName: r.first_name, lastName: r.last_name,
      email: r.email, role: r.role, isActive: r.is_active, createdAt: r.created_at,
    })));
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

app.post('/api/admin/panel/users', requireRole('superadmin', 'admin'), async (req: any, res) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;
    if (!email || !password || !role) return res.status(400).json({ error: { message: 'email, password ve role gerekli.' } });

    // Cannot create another superadmin via API
    if (role === 'superadmin') return res.status(403).json({ error: { message: 'SuperAdmin yalnızca CLI üzerinden oluşturulabilir.' } });

    if (!MANAGEABLE_ADMIN_ROLES.includes(role)) {
      return res.status(400).json({ error: { message: `Geçersiz rol. Geçerli roller: ${MANAGEABLE_ADMIN_ROLES.join(', ')}` } });
    }

    const exists = await pool.query('SELECT id FROM admin_users WHERE email = $1', [email]);
    if (exists.rows.length > 0) return res.status(409).json({ error: { message: 'Bu e-posta adresi zaten kayıtlı.' } });

    const hash = await bcrypt.hash(password, 10);
    const docId = genDocId();
    const result = await pool.query(
      `INSERT INTO admin_users (document_id, first_name, last_name, email, password_hash, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, true, $7, $7) RETURNING *`,
      [docId, firstName || '', lastName || '', email, hash, role, now()]
    );
    const r = result.rows[0];
    res.json({
      id: r.id, documentId: r.document_id, firstName: r.first_name, lastName: r.last_name,
      email: r.email, role: r.role, isActive: r.is_active,
    });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

app.put('/api/admin/panel/users/:id', requireRole('superadmin', 'admin'), async (req: any, res) => {
  try {
    const targetId = req.params.id;
    const isNumeric = /^\d+$/.test(targetId);
    const target = isNumeric
      ? await pool.query('SELECT * FROM admin_users WHERE id = $1 OR document_id = $1::text', [targetId])
      : await pool.query('SELECT * FROM admin_users WHERE document_id = $1', [targetId]);

    if (target.rows.length === 0) return res.status(404).json({ error: { message: 'Kullanıcı bulunamadı.' } });

    const targetUser = target.rows[0];
    const isSelf = targetUser.id === req.admin.adminId;

    if (targetUser.role === 'superadmin') {
      return res.status(403).json({ error: { message: 'SuperAdmin hesabı arayüzden değiştirilemez.' } });
    }

    const { firstName, lastName, email, password, role, isActive } = req.body;

    if (role === 'superadmin') {
      return res.status(403).json({ error: { message: 'SuperAdmin rolü arayüzden atanamaz.' } });
    }

    if (role !== undefined && !MANAGEABLE_ADMIN_ROLES.includes(role)) {
      return res.status(400).json({ error: { message: `Geçersiz rol. Geçerli roller: ${MANAGEABLE_ADMIN_ROLES.join(', ')}` } });
    }

    const sets: string[] = ['updated_at = $1'];
    const vals: any[] = [now()];
    let idx = 2;

    if (firstName !== undefined) { sets.push(`first_name = $${idx}`); vals.push(firstName); idx++; }
    if (lastName !== undefined) { sets.push(`last_name = $${idx}`); vals.push(lastName); idx++; }
    if (email !== undefined) { sets.push(`email = $${idx}`); vals.push(email); idx++; }
    if (password) { sets.push(`password_hash = $${idx}`); vals.push(await bcrypt.hash(password, 10)); idx++; }
    if (role !== undefined) { sets.push(`role = $${idx}`); vals.push(role); idx++; }
    if (isActive !== undefined) { sets.push(`is_active = $${idx}`); vals.push(isActive); idx++; }

    vals.push(targetUser.id);
    await pool.query(`UPDATE admin_users SET ${sets.join(', ')} WHERE id = $${idx}`, vals);

    // If updating self, return a fresh token to sync the UI
    if (isSelf) {
      const updatedR = await pool.query('SELECT * FROM admin_users WHERE id = $1', [targetUser.id]);
      const updatedAdmin = updatedR.rows[0];
      const newToken = signAdminToken(updatedAdmin);
      return res.json({ ok: true, jwt: newToken });
    }

    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

app.delete('/api/admin/panel/users/:id', requireRole('superadmin', 'admin'), async (req: any, res) => {
  try {
    const targetId = req.params.id;
    const isNumeric = /^\d+$/.test(targetId);
    const target = isNumeric
      ? await pool.query('SELECT * FROM admin_users WHERE id = $1 OR document_id = $1::text', [targetId])
      : await pool.query('SELECT * FROM admin_users WHERE document_id = $1', [targetId]);

    if (target.rows.length === 0) return res.status(404).json({ error: { message: 'Kullanıcı bulunamadı.' } });
    if (target.rows[0].role === 'superadmin') return res.status(403).json({ error: { message: 'SuperAdmin hesabı silinemez.' } });

    await pool.query('DELETE FROM admin_users WHERE id = $1', [target.rows[0].id]);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// ==========================================
// ========== HEALTH CHECK ==========
// ==========================================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: now(), engine: 'Example Custom Backend' });
});

// ========== GOOGLE ACCOUNT LINKING ==========
app.post('/api/user/link-google', authMiddleware, async (req: any, res) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken) return res.status(400).json({ error: { message: 'Google access_token gerekli.' } });

    // Google'dan profil bilgisini al
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const profile: any = await profileRes.json();
    if (!profile.sub || !profile.email) return res.status(400).json({ error: { message: 'Google profili alınamadı.' } });

    // Bu google_id başka bir hesapta kullanılıyor mu?
    const existing = await pool.query('SELECT id FROM up_users WHERE google_id = $1 AND id != $2', [profile.sub, req.userId]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: { message: 'Bu Google hesabı zaten başka bir kullanıcıya bağlı.' } });
    }

    // Kullanıcıya google_id bağla
    await pool.query(
      'UPDATE up_users SET google_id = $1, updated_at = $2 WHERE id = $3',
      [profile.sub, now(), req.userId]
    );

    res.json({ ok: true, googleEmail: profile.email });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// ========== DB MIGRATIONS ==========
async function runMigrations() {
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
    // Yeni kolonları ekleyelim (ALTER TABLE)
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
    // Ensure all columns exist (for tables created by older schema)
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
}

// ==========================================
// ========== DESTEK / ŞİKAYET SİSTEMİ ==========
// ==========================================

// Public: Destek talebi oluştur
app.post('/api/support', rateLimitMiddleware, async (req, res) => {
  try {
    const { name, email, subject, message, userId } = req.body;

    // Validasyon
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: { message: 'Ad, e-posta, konu ve mesaj alanları zorunludur.' } });
    }

    // E-posta formatı kontrolü
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: { message: 'Geçerli bir e-posta adresi giriniz.' } });
    }

    const result = await pool.query(
      `INSERT INTO support_tickets (user_id, name, email, subject, message, status, created_at)
       VALUES ($1, $2, $3, $4, $5, 'open', $6) RETURNING *`,
      [userId || null, name, email, subject, message, now()]
    );

    res.json({ ok: true, ticketId: result.rows[0].id });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Admin: Tüm destek taleplerini listele
app.get('/api/admin/support/tickets', requireRole('superadmin', 'admin'), async (req: any, res) => {
  try {
    const result = await pool.query(`
      SELECT st.*, u.username as user_username, u.first_name as user_first_name, u.last_name as user_last_name
      FROM support_tickets st
      LEFT JOIN up_users u ON u.id = st.user_id
      ORDER BY st.created_at DESC
    `);

    const data = result.rows.map(t => ({
      id: t.id,
      userId: t.user_id,
      name: t.name,
      email: t.email,
      subject: t.subject,
      message: t.message,
      status: t.status,
      createdAt: t.created_at,
      user: t.user_id ? {
        username: t.user_username,
        firstName: t.user_first_name,
        lastName: t.user_last_name,
      } : null,
    }));

    res.json({ data });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Admin: Tekil destek talebi detayı
app.get('/api/admin/support/tickets/:id', requireRole('superadmin', 'admin'), async (req: any, res) => {
  try {
    const result = await pool.query(`
      SELECT st.*, u.username as user_username, u.first_name as user_first_name, u.last_name as user_last_name, u.email as user_email
      FROM support_tickets st
      LEFT JOIN up_users u ON u.id = st.user_id
      WHERE st.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Destek talebi bulunamadı.' } });
    }

    const t = result.rows[0];
    res.json({
      id: t.id,
      userId: t.user_id,
      name: t.name,
      email: t.email,
      subject: t.subject,
      message: t.message,
      status: t.status,
      createdAt: t.created_at,
      user: t.user_id ? {
        username: t.user_username,
        firstName: t.user_first_name,
        lastName: t.user_last_name,
        email: t.user_email,
      } : null,
    });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Admin: Destek talebi statüsünü güncelle
app.put('/api/admin/support/tickets/:id', requireRole('superadmin', 'admin'), async (req: any, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['open', 'read', 'resolved'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: { message: `Geçersiz statü. Geçerli değerler: ${validStatuses.join(', ')}` } });
    }

    await pool.query('UPDATE support_tickets SET status = $1 WHERE id = $2', [status, req.params.id]);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// ========== START ==========
runMigrations().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Example Backend çalışıyor: http://0.0.0.0:${PORT}`);
    console.log(`📦 Motor: Express.js + PostgreSQL (Strapi'siz)`);
    console.log(`🔑 Google OAuth: ${GOOGLE_CLIENT_ID ? 'Aktif' : 'Devre dışı'}`);
  });
});
