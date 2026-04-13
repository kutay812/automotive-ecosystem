import express from 'express';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import cors from 'cors';
import path from 'path';

// ========== CONFIG ==========
const PORT = parseInt(process.env.PORT || '1337');
const JWT_SECRET = process.env.JWT_SECRET || 'visionarc-jwt-secret-2026';
const ADMIN_SECRET = 'visionarc-secret-google-123';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = `http://localhost:${PORT}/api/connect/google/callback`;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// ========== APP ==========
const app = express();
app.use(express.json());
app.use(cors({ origin: true, credentials: true }));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// ========== DATABASE ==========
const pool = new Pool({
  host: process.env.DATABASE_HOST || 'postgres',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  database: process.env.DATABASE_NAME || 'vizyonarc_db',
  user: process.env.DATABASE_USERNAME || 'vizyonarc',
  password: process.env.DATABASE_PASSWORD || 'vizyonarc_pwd',
});

// ========== HELPERS ==========
function genDocId() { return crypto.randomBytes(12).toString('hex').slice(0, 24); }
function signToken(userId: number, docId: string) {
  return jwt.sign({ id: userId, documentId: docId }, JWT_SECRET, { expiresIn: '7d' });
}
function now() { return new Date().toISOString(); }

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

// JWT Middleware
function authMiddleware(req: any, res: any, next: any) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: { message: 'Token gerekli.' } });
  try {
    const payload = jwt.verify(header.split(' ')[1], JWT_SECRET) as any;
    req.userId = payload.id;
    req.userDocId = payload.documentId;
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
    imageUrl: row.image_url, // Ekstra alan olarak da kalsın
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
    confirmed: row.confirmed,
    blocked: row.blocked,
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

  return {
    id: row.id,
    documentId: row.document_id,
    rentalStatus: row.rental_status,
    requestedEndDate: row.requested_end_date,
    pickupOffice: row.pickup_office,
    dropoffOffice: row.dropoff_office,
    startDate: row.start_date,
    endDate: row.end_date,
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
app.post('/api/auth/local', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    const result = await pool.query('SELECT * FROM up_users WHERE email = $1 OR username = $1', [identifier]);
    if (result.rows.length === 0) return res.status(400).json({ error: { message: 'E-posta veya şifre hatalı.' } });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: { message: 'E-posta veya şifre hatalı.' } });

    const token = signToken(user.id, user.document_id);
    res.json({ jwt: token, user: formatUser(user) });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Kayıt ol
app.post('/api/auth/local/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const exists = await pool.query('SELECT id FROM up_users WHERE email = $1', [email]);
    if (exists.rows.length > 0) return res.status(400).json({ error: { message: 'Bu e-posta zaten kayıtlı.' } });

    const hash = await bcrypt.hash(password, 10);
    const docId = genDocId();
    const result = await pool.query(
      `INSERT INTO up_users (document_id, username, email, password, provider, confirmed, blocked, created_at, updated_at, published_at)
       VALUES ($1, $2, $3, $4, 'local', true, false, $5, $5, $5) RETURNING *`,
      [docId, username, email, hash, now()]
    );

    const user = result.rows[0];
    await assignDefaultRole(user.id);
    const token = signToken(user.id, user.document_id);
    res.json({ jwt: token, user: formatUser(user) });
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
app.post('/api/user-extension/update-profile', async (req, res) => {
  try {
    const { userId, documentId, username, firstName, lastName, secret } = req.body;
    if (secret !== ADMIN_SECRET) return res.status(401).json({ error: { message: 'Yetkisiz.' } });

    const id = userId || documentId;
    const field = documentId ? 'document_id' : 'id';
    await pool.query(
      `UPDATE up_users SET username = COALESCE($1, username), first_name = COALESCE($2, first_name), last_name = COALESCE($3, last_name), updated_at = $4 WHERE ${field} = $5`,
      [username, firstName, lastName, now(), id]
    );
    res.json({ ok: true });
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

    // Kullanıcıyı bul veya oluştur
    let userResult = await pool.query('SELECT * FROM up_users WHERE email = $1', [profile.email]);
    let user;

    if (userResult.rows.length > 0) {
      user = userResult.rows[0];
      // Ad soyad güncelle
      await pool.query(
        'UPDATE up_users SET first_name = COALESCE($1, first_name), last_name = COALESCE($2, last_name), username = COALESCE($3, username), updated_at = $4 WHERE id = $5',
        [profile.given_name, profile.family_name || '-', profile.name || profile.email.split('@')[0], now(), user.id]
      );
      userResult = await pool.query('SELECT * FROM up_users WHERE id = $1', [user.id]);
      user = userResult.rows[0];
    } else {
      const docId = genDocId();
      const randomPass = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
      const insertResult = await pool.query(
        `INSERT INTO up_users (document_id, username, email, password, provider, first_name, last_name, confirmed, blocked, created_at, updated_at, published_at)
         VALUES ($1, $2, $3, $4, 'google', $5, $6, true, false, $7, $7, $7) RETURNING *`,
        [docId, profile.name || profile.email.split('@')[0], profile.email, randomPass, profile.given_name || '', profile.family_name || '-', now()]
      );
      user = insertResult.rows[0];
      await assignDefaultRole(user.id);
    }

    const token = signToken(user.id, user.document_id);
    res.json({ jwt: token, user: formatUser(user) });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// ==========================================
// ========== CAR ROUTES ==========
// ==========================================

app.get('/api/cars', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cars WHERE published_at IS NOT NULL ORDER BY id DESC');
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
      `INSERT INTO cars (document_id, brand, model, year, price_per_day, description, is_available, transmission, fuel_type, passenger_count, luggage_count, image_url, created_at, updated_at, published_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13,$13) RETURNING *`,
      [docId, d.brand, d.model, d.year, d.pricePerDay, d.description || null, d.isAvailable !== false, d.transmission || 'Otomatik', d.fuelType || 'Benzin', d.passengerCount || 5, d.luggageCount || 2, d.imageUrl || null, now()]
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
      imageUrl: 'image_url',
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
app.post('/api/rental-operations/create', async (req, res) => {
  try {
    const { secret, userId, carId, pickupOffice, dropoffOffice, startDate, endDate } = req.body;
    if (secret !== ADMIN_SECRET) return res.status(401).json({ error: { message: 'Yetkisiz.' } });

    // Araç kontrolü
    const carResult = await pool.query('SELECT * FROM cars WHERE document_id = $1', [carId]);
    if (carResult.rows.length === 0 || carResult.rows[0].is_available === false) {
      return res.status(400).json({ error: { message: 'Bu araç müsait değil.' } });
    }

    // Çakışma kontrolü
    if (await checkDateConflict(carId, startDate, endDate)) {
      return res.status(400).json({ error: { message: 'Bu araç seçtiğiniz tarihler arasında zaten kirada.' } });
    }

    const docId = genDocId();
    const rental = await pool.query(
      `INSERT INTO rentals (document_id, rental_status, pickup_office, dropoff_office, start_date, end_date, created_at, updated_at, published_at)
       VALUES ($1, 'bekliyor', $2, $3, $4, $5, $6, $6, $6) RETURNING *`,
      [docId, pickupOffice, dropoffOffice, startDate, endDate, now()]
    );
    const rentalId = rental.rows[0].id;

    // Link: rental → car
    await pool.query('INSERT INTO rentals_car_lnk (rental_id, car_id) VALUES ($1, $2)', [rentalId, carResult.rows[0].id]);

    // Link: rental → user
    let userResult = await pool.query('SELECT id FROM up_users WHERE document_id = $1', [userId]);
    if (userResult.rows.length === 0 && !isNaN(Number(userId))) {
      userResult = await pool.query('SELECT id FROM up_users WHERE id = $1', [userId]);
    }
    if (userResult.rows.length > 0) {
      await pool.query('INSERT INTO rentals_user_lnk (rental_id, user_id) VALUES ($1, $2)', [rentalId, userResult.rows[0].id]);
    }

    res.json(await formatRental(rental.rows[0]));
  } catch (e: any) {
    res.status(400).json({ error: { message: e.message, details: e.message } });
  }
});

// Durum güncelle (kullanıcı tarafı)
app.post('/api/rental-operations/update-status', async (req, res) => {
  try {
    const { secret, rentalId, rentalStatus, requestedEndDate } = req.body;
    if (secret !== ADMIN_SECRET) return res.status(401).json({ error: { message: 'Yetkisiz.' } });

    const sets = ['rental_status = $1', 'updated_at = $2'];
    const vals: any[] = [rentalStatus, now()];
    if (requestedEndDate) { sets.push('requested_end_date = $3'); vals.push(requestedEndDate); }
    vals.push(rentalId);

    await pool.query(`UPDATE rentals SET ${sets.join(', ')} WHERE document_id = $${vals.length}`, vals);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ error: { message: e.message } });
  }
});

// Kullanıcının kiralamaları
app.get('/api/rental-operations/my-rentals', async (req, res) => {
  try {
    const { secret, userId } = req.query;
    if (secret !== ADMIN_SECRET) return res.status(401).json({ error: { message: 'Yetkisiz.' } });

    let userResult = await pool.query('SELECT id FROM up_users WHERE document_id = $1', [userId]);
    if (userResult.rows.length === 0 && !isNaN(Number(userId))) {
      // Fallback: Check by numeric ID if not found by document_id
      userResult = await pool.query('SELECT id FROM up_users WHERE id = $1', [userId]);
    }

    if (userResult.rows.length === 0) return res.json([]);

    const rentals = await pool.query(
      `SELECT r.* FROM rentals r JOIN rentals_user_lnk rul ON rul.rental_id = r.id
       WHERE rul.user_id = $1 ORDER BY r.created_at DESC`, [userResult.rows[0].id]
    );
    const formatted = await Promise.all(rentals.rows.map(formatRental));
    res.json(formatted);
  } catch (e: any) {
    res.status(400).json({ error: { message: e.message } });
  }
});

// ========== ADMIN RENTAL OPERATIONS ==========

app.get('/api/rental-operations/admin/all', async (req, res) => {
  try {
    if (req.query.secret !== ADMIN_SECRET) return res.status(401).json({ error: { message: 'Yetkisiz.' } });
    const rentals = await pool.query('SELECT * FROM rentals ORDER BY created_at DESC');
    const formatted = await Promise.all(rentals.rows.map(formatRental));
    res.json(formatted);
  } catch (e: any) {
    res.status(400).json({ error: { message: e.message } });
  }
});

app.get('/api/rental-operations/admin/stats', async (req, res) => {
  try {
    if (req.query.secret !== ADMIN_SECRET) return res.status(401).json({ error: { message: 'Yetkisiz.' } });

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

// Admin aksiyon helper
async function adminRentalAction(req: any, res: any, updateFn: (rentalId: string) => Promise<void>) {
  try {
    if (req.body.secret !== ADMIN_SECRET) return res.status(401).json({ error: { message: 'Yetkisiz.' } });
    await updateFn(req.body.rentalId);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ error: { message: e.message, details: e.message } });
  }
}

app.post('/api/rental-operations/admin/approve', (req, res) =>
  adminRentalAction(req, res, async (id) => {
    await pool.query("UPDATE rentals SET rental_status = 'aktif', updated_at = $1 WHERE document_id = $2", [now(), id]);
  })
);

app.post('/api/rental-operations/admin/reject', (req, res) =>
  adminRentalAction(req, res, async (id) => {
    await pool.query("UPDATE rentals SET rental_status = 'iptal', updated_at = $1 WHERE document_id = $2", [now(), id]);
  })
);

app.post('/api/rental-operations/admin/approve-extension', async (req, res) => {
  try {
    if (req.body.secret !== ADMIN_SECRET) return res.status(401).json({ error: { message: 'Yetkisiz.' } });
    const rental = await pool.query('SELECT * FROM rentals WHERE document_id = $1', [req.body.rentalId]);
    if (rental.rows.length === 0 || !rental.rows[0].requested_end_date) {
      return res.status(400).json({ error: { message: 'Uzatma talebi bulunamadı.' } });
    }
    const r = rental.rows[0];

    // Çakışma kontrolü
    const carLnk = await pool.query('SELECT car_id FROM rentals_car_lnk WHERE rental_id = $1', [r.id]);
    if (carLnk.rows.length > 0) {
      const car = await pool.query('SELECT document_id FROM cars WHERE id = $1', [carLnk.rows[0].car_id]);
      if (car.rows.length > 0) {
        const conflict = await checkDateConflict(car.rows[0].document_id, String(r.end_date), String(r.requested_end_date), r.document_id);
        if (conflict) return res.status(400).json({ error: { message: 'Uzatma tarihleri başka bir kiralama ile çakışıyor.' } });
      }
    }

    await pool.query(
      "UPDATE rentals SET end_date = requested_end_date, requested_end_date = NULL, rental_status = 'aktif', updated_at = $1 WHERE document_id = $2",
      [now(), req.body.rentalId]
    );
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ error: { message: e.message } });
  }
});

app.post('/api/rental-operations/admin/reject-extension', (req, res) =>
  adminRentalAction(req, res, async (id) => {
    await pool.query("UPDATE rentals SET requested_end_date = NULL, rental_status = 'aktif', updated_at = $1 WHERE document_id = $2", [now(), id]);
  })
);

app.post('/api/rental-operations/admin/complete', (req, res) =>
  adminRentalAction(req, res, async (id) => {
    await pool.query("UPDATE rentals SET rental_status = 'bitti', updated_at = $1 WHERE document_id = $2", [now(), id]);
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
    }));
    res.json({ data });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Admin: ofis ekle
app.post('/api/admin/offices', async (req, res) => {
  try {
    const { secret, name, city, address, phone } = req.body;
    if (secret !== ADMIN_SECRET) return res.status(401).json({ error: { message: 'Yetkisiz.' } });

    const docId = genDocId();
    const result = await pool.query(
      `INSERT INTO offices (document_id, name, city, address, phone, is_active, created_at, updated_at, published_at)
       VALUES ($1, $2, $3, $4, $5, true, $6, $6, $6) RETURNING *`,
      [docId, name, city, address || '', phone || '', now()]
    );
    res.json({ ok: true, data: result.rows[0] });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Admin: ofis güncelle
app.put('/api/admin/offices/:id', async (req, res) => {
  try {
    const { secret, name, city, address, phone, isActive } = req.body;
    if (secret !== ADMIN_SECRET) return res.status(401).json({ error: { message: 'Yetkisiz.' } });

    const sets = ['updated_at = $1'];
    const vals: any[] = [now()];
    let idx = 2;

    if (name !== undefined) { sets.push(`name = $${idx}`); vals.push(name); idx++; }
    if (city !== undefined) { sets.push(`city = $${idx}`); vals.push(city); idx++; }
    if (address !== undefined) { sets.push(`address = $${idx}`); vals.push(address); idx++; }
    if (phone !== undefined) { sets.push(`phone = $${idx}`); vals.push(phone); idx++; }
    if (isActive !== undefined) { sets.push(`is_active = $${idx}`); vals.push(isActive); idx++; }

    vals.push(req.params.id);
    await pool.query(`UPDATE offices SET ${sets.join(', ')} WHERE document_id = $${idx} OR id::text = $${idx}`, vals);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Admin: ofis sil
app.delete('/api/admin/offices/:id', async (req, res) => {
  try {
    if (req.query.secret !== ADMIN_SECRET) return res.status(401).json({ error: { message: 'Yetkisiz.' } });
    await pool.query('DELETE FROM offices WHERE document_id = $1 OR id::text = $1', [req.params.id]);
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

// ==========================================
// ========== PROJECTS ==========
// ==========================================

app.get('/api/projects', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM projects WHERE published_at IS NOT NULL ORDER BY id DESC');
    const data = result.rows.map(r => ({
      id: r.id, documentId: r.document_id, title: r.title, client: r.client,
      videoUrl: r.video_url, description: r.description, date: r.date,
    }));
    res.json({ data });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// ==========================================
// ========== KULLANICI YÖNETİMİ ==========
// ==========================================

// Tüm kullanıcıları listele
app.get('/api/admin/users', async (req, res) => {
  try {
    if (req.query.secret !== ADMIN_SECRET) return res.status(401).json({ error: { message: 'Yetkisiz.' } });

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
      confirmed: u.confirmed,
      blocked: u.blocked,
      role: u.role_name || 'Authenticated',
      roleType: u.role_type || 'authenticated',
      createdAt: u.created_at,
      updatedAt: u.updated_at,
    }));
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Kullanıcı güncelle (rol, engelle/aç)
app.put('/api/admin/users/:id', async (req, res) => {
  try {
    if (req.body.secret !== ADMIN_SECRET) return res.status(401).json({ error: { message: 'Yetkisiz.' } });

    const { blocked, roleId, firstName, lastName } = req.body;
    const userId = req.params.id;

    const sets: string[] = ['updated_at = $1'];
    const vals: any[] = [now()];
    let idx = 2;

    if (blocked !== undefined) { sets.push(`blocked = $${idx}`); vals.push(blocked); idx++; }
    if (firstName !== undefined) { sets.push(`first_name = $${idx}`); vals.push(firstName); idx++; }
    if (lastName !== undefined) { sets.push(`last_name = $${idx}`); vals.push(lastName); idx++; }

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
app.delete('/api/admin/users/:id', async (req, res) => {
  try {
    if (req.query.secret !== ADMIN_SECRET) return res.status(401).json({ error: { message: 'Yetkisiz.' } });

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
app.get('/api/admin/roles', async (req, res) => {
  try {
    if (req.query.secret !== ADMIN_SECRET) return res.status(401).json({ error: { message: 'Yetkisiz.' } });

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
app.get('/api/admin/roles/:id', async (req, res) => {
  try {
    if (req.query.secret !== ADMIN_SECRET) return res.status(401).json({ error: { message: 'Yetkisiz.' } });

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
app.get('/api/admin/permissions', async (req, res) => {
  try {
    if (req.query.secret !== ADMIN_SECRET) return res.status(401).json({ error: { message: 'Yetkisiz.' } });

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
app.post('/api/admin/roles', async (req, res) => {
  try {
    if (req.body.secret !== ADMIN_SECRET) return res.status(401).json({ error: { message: 'Yetkisiz.' } });

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
app.put('/api/admin/roles/:id', async (req, res) => {
  try {
    if (req.body.secret !== ADMIN_SECRET) return res.status(401).json({ error: { message: 'Yetkisiz.' } });

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
app.delete('/api/admin/roles/:id', async (req, res) => {
  try {
    if (req.query.secret !== ADMIN_SECRET) return res.status(401).json({ error: { message: 'Yetkisiz.' } });

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
app.post('/api/admin/roles/:id/permissions', async (req, res) => {
  try {
    if (req.body.secret !== ADMIN_SECRET) return res.status(401).json({ error: { message: 'Yetkisiz.' } });

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
app.post('/api/admin/roles/:id/users', async (req, res) => {
  try {
    if (req.body.secret !== ADMIN_SECRET) return res.status(401).json({ error: { message: 'Yetkisiz.' } });

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
app.get('/api/admin/media', async (req, res) => {
  try {
    if (req.query.secret !== ADMIN_SECRET) return res.status(401).json({ error: { message: 'Yetkisiz.' } });

    const files = await pool.query(`
      SELECT f.*, frm.related_type, frm.field, frm.related_id
      FROM files f
      LEFT JOIN files_related_mph frm ON frm.file_id = f.id
      ORDER BY f.created_at DESC
    `);

    const data = files.rows.map(f => ({
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
      relatedType: f.related_type,
      relatedField: f.field,
      relatedId: f.related_id,
      createdAt: f.created_at,
    }));

    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Medya dosyası sil
app.delete('/api/admin/media/:id', async (req, res) => {
  try {
    if (req.query.secret !== ADMIN_SECRET) return res.status(401).json({ error: { message: 'Yetkisiz.' } });

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
app.post('/api/admin/media/upload', async (req, res) => {
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

        if (secret !== ADMIN_SECRET) return res.status(401).json({ error: { message: 'Yetkisiz.' } });
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

  // Cars image_url ekleme
  try {
    await pool.query('ALTER TABLE cars ADD COLUMN IF NOT EXISTS image_url TEXT');
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
app.post('/api/admin/homepage-media', async (req, res) => {
  try {
    if (req.body.secret !== ADMIN_SECRET) return res.status(401).json({ error: { message: 'Yetkisiz.' } });
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
app.put('/api/admin/homepage-media/:id', async (req, res) => {
  try {
    if (req.body.secret !== ADMIN_SECRET) return res.status(401).json({ error: { message: 'Yetkisiz.' } });
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
app.delete('/api/admin/homepage-media/:id', async (req, res) => {
  try {
    if (req.query.secret !== ADMIN_SECRET) return res.status(401).json({ error: { message: 'Yetkisiz.' } });
    await pool.query('DELETE FROM homepage_media WHERE id = $1 OR document_id = $1::text', [req.params.id]);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// ==========================================
// ========== HEALTH CHECK ==========
// ==========================================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: now(), engine: 'VisionArc Custom Backend' });
});

// ========== START ==========
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 VisionArc Backend çalışıyor: http://0.0.0.0:${PORT}`);
  console.log(`📦 Motor: Express.js + PostgreSQL (Strapi'siz)`);
  console.log(`🔑 Google OAuth: ${GOOGLE_CLIENT_ID ? 'Aktif' : 'Devre dışı'}`);
});
