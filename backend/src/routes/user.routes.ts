import { Router } from 'express';
import { pool } from '../database/db';
import { authMiddleware } from '../middlewares/auth';
import { now, formatUser } from '../utils/helpers';

export const userRouter = Router();

// Mevcut kullanıcı
userRouter.get('/users/me', authMiddleware, async (req: any, res) => {
  try {
    const result = await pool.query('SELECT * FROM up_users WHERE id = $1', [req.userId]);
    if (result.rows.length === 0) return res.status(401).json({ error: { message: 'Kullanıcı bulunamadı.' } });
    res.json(formatUser(result.rows[0]));
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Profil güncelleme
userRouter.post('/user-extension/update-profile', authMiddleware, async (req: any, res: any) => {
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
userRouter.post('/user-extension/verify-phone', authMiddleware, async (req: any, res: any) => {
  try {
    const { phone } = req.body;
    const userId = req.userId; // IDOR

    if (!phone) return res.status(400).json({ error: { message: 'Telefon numarası eksik.' } });

    await pool.query(
      `UPDATE up_users SET phone_number = $1, phone_verified_at = $2, updated_at = $2 WHERE id = $3`,
      [phone, now(), userId]
    );
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// ========== PROFİL DETAYLARI (Dashboard) ==========
userRouter.get('/user/profile-details', authMiddleware, async (req: any, res) => {
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

// ========== GOOGLE ACCOUNT LINKING ==========
userRouter.post('/user/link-google', authMiddleware, async (req: any, res) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken) return res.status(400).json({ error: { message: 'Google access_token gerekli.' } });

    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const profile: any = await profileRes.json();
    if (!profile.sub || !profile.email) return res.status(400).json({ error: { message: 'Google profili alınamadı.' } });

    const existing = await pool.query('SELECT id FROM up_users WHERE google_id = $1 AND id != $2', [profile.sub, req.userId]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: { message: 'Bu Google hesabı zaten başka bir kullanıcıya bağlı.' } });
    }

    await pool.query(
      'UPDATE up_users SET google_id = $1, updated_at = $2 WHERE id = $3',
      [profile.sub, now(), req.userId]
    );

    res.json({ ok: true, googleEmail: profile.email });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});
