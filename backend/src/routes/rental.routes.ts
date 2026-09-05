import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../database/db';
import { authMiddleware, requireRole, rateLimitMiddleware } from '../middlewares/auth';
import { asyncHandler } from '../middlewares/asyncHandler';
import { ADMIN_JWT_SECRET, ADMIN_SECRET } from '../config/env';
import { genDocId, now, formatRental, getEnrichedRentals } from '../utils/helpers';
import { invalidateCache } from '../config/redis';
import { getPaymentProvider } from '../services/payment/PaymentProvider';
import {
  checkDateConflict,
  getRentalStats,
  approveRentalService,
  rejectRentalService,
  rejectEarlyReturnService,
  approveExtensionService,
  rejectExtensionService,
  completeRentalService,
  approveEarlyReturnService,
  markRentalPaidService,
  unmarkRentalPaidService,
} from '../services/rental.service';

export const rentalRouter = Router();

// Admin aksiyon yetki doğrulayıcı helper
async function adminRentalAction(req: any, res: any, updateFn: (rentalId: string) => Promise<void>) {
  try {
    if (!req.admin) {
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

// Kiralama oluştur
rentalRouter.post(
  '/rental-operations/create',
  authMiddleware,
  asyncHandler(async (req: any, res: any) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { carId, pickupOffice, dropoffOffice, startDate, endDate, paymentMethod } = req.body;
      const userId = req.userId;

      const userResult = await client.query('SELECT * FROM up_users WHERE id = $1', [userId]);
      if (userResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: { message: 'Kullanıcı bulunamadı.' } });
      }

      const u = userResult.rows[0];
      if (!u.phone_number || !u.phone_verified_at) {
        await client.query('ROLLBACK');
        return res.status(403).json({
          error: { message: 'Lütfen araç kiralamadan önce telefon numaranızı hesabınıza ekleyip doğrulayın.' },
        });
      }

      const carResult = await client.query('SELECT * FROM cars WHERE document_id = $1 FOR UPDATE', [carId]);
      if (carResult.rows.length === 0 || carResult.rows[0].is_available === false) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: { message: 'Bu araç müsait değil.' } });
      }
      const actualCarId = carResult.rows[0].id;

      if (new Date(endDate) <= new Date(startDate)) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: {
            message: 'Teslim tarihi, alış tarihinden sonra olmalıdır.',
            details: 'Teslim tarihi, alış tarihinden sonra olmalıdır.',
          },
        });
      }

      const hasConflict = await checkDateConflict(carId, startDate, endDate);
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

      await client.query('INSERT INTO rentals_car_lnk (rental_id, car_id) VALUES ($1, $2)', [rentalId, actualCarId]);
      await client.query('INSERT INTO rentals_user_lnk (rental_id, user_id) VALUES ($1, $2)', [rentalId, userId]);

      await client.query('COMMIT');
      await invalidateCache('cars:*');

      res.json(await formatRental(rental.rows[0]));
    } catch (e: any) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: { message: e.message, details: e.message } });
    } finally {
      client.release();
    }
  })
);

// Durum güncelle (kullanıcı tarafı: iptal, uzatma talep, erken iade bildirme)
rentalRouter.post(
  '/rental-operations/update-status',
  authMiddleware,
  asyncHandler(async (req: any, res: any) => {
    const { rentalId, rentalStatus, requestedEndDate } = req.body;
    const userId = req.userId;

    const rental = await pool.query('SELECT * FROM rentals WHERE document_id = $1', [rentalId]);
    if (rental.rows.length === 0) return res.status(404).json({ error: { message: 'Kiralama bulunamadı.' } });
    const currentRental = rental.rows[0];

    const userLnk = await pool.query('SELECT user_id FROM rentals_user_lnk WHERE rental_id = $1', [currentRental.id]);
    if (userLnk.rows.length === 0 || userLnk.rows[0].user_id !== userId) {
      return res.status(403).json({ error: { message: 'Bu kiralama üzerinde işlem yapma yetkiniz yok.' } });
    }

    if (rentalStatus === 'uzatma_talep' && requestedEndDate) {
      const currentEnd = new Date(currentRental.end_date);
      const newEnd = new Date(requestedEndDate);
      if (newEnd <= currentEnd) {
        return res.status(400).json({
          error: {
            message:
              'Uzatma tarihi, mevcut teslim tarihinden (' + currentEnd.toLocaleDateString('tr-TR') + ') daha ileri olmalıdır.',
          },
        });
      }
    }

    if ((rentalStatus === 'iade_bildirildi' || rentalStatus === 'erken_teslim_talep') && requestedEndDate) {
      const startD = new Date(currentRental.start_date);
      const returnD = new Date(requestedEndDate);
      if (returnD <= startD) {
        return res.status(400).json({
          error: {
            message:
              'Erken teslim tarihi, alış tarihiyle aynı gün veya daha öncesi olamaz. Minimum 1 gün kiralama zorunludur.',
          },
        });
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
  })
);

// Kullanıcının kiralamaları (N+1 engellendi: tek JOIN sorgusu)
rentalRouter.get(
  '/rental-operations/my-rentals',
  authMiddleware,
  asyncHandler(async (req: any, res: any) => {
    const userId = req.userId;
    const formatted = await getEnrichedRentals('WHERE rul.user_id = $1 ORDER BY r.created_at DESC', [userId]);
    res.json(formatted);
  })
);

// Çevrim içi Ödeme Başlatma (Checkout Session Oluşturma)
rentalRouter.post(
  '/rental-operations/checkout',
  authMiddleware,
  asyncHandler(async (req: any, res: any) => {
    const { rentalId, provider } = req.body;
    const userId = req.userId;

    const rentalResult = await pool.query('SELECT * FROM rentals WHERE document_id = $1', [rentalId]);
    if (rentalResult.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Kiralama bulunamadı.' } });
    }
    const rental = rentalResult.rows[0];

    const userLnk = await pool.query('SELECT user_id FROM rentals_user_lnk WHERE rental_id = $1', [rental.id]);
    if (userLnk.rows.length === 0 || userLnk.rows[0].user_id !== userId) {
      return res.status(403).json({ error: { message: 'Bu kiralama için ödeme başlatma yetkiniz yok.' } });
    }

    const paymentProvider = getPaymentProvider(provider);
    const session = await paymentProvider.createCheckoutSession(rental);

    res.json({
      ok: true,
      provider: paymentProvider.name,
      checkoutUrl: session.checkoutUrl,
      transactionId: session.transactionId,
    });
  })
);

// Ödeme başarılı callback'i / Webhook
rentalRouter.post(
  '/rental-operations/payment/success',
  rateLimitMiddleware,
  asyncHandler(async (req, res) => {
    const providerName = (req.query.provider as string) || req.body.provider || 'dummy';
    const provider = getPaymentProvider(providerName);
    const verification = await provider.verifyWebhook(req);

    if (!verification.success) {
      return res.status(401).json({ error: { message: verification.message || 'Geçersiz ödeme doğrulaması.' } });
    }

    await pool.query(
      `UPDATE rentals 
       SET payment_status = 'paid', rental_status = 'aktif', approval_status = 'approved', transaction_id = $1, paid_at = $2, updated_at = $2 
       WHERE document_id = $3 AND payment_status = 'pending'`,
      [verification.transactionId, now(), verification.rentalId]
    );

    await invalidateCache('cars:*');

    res.json({ ok: true, message: 'Ödeme başarıyla alındı ve onaylandı.' });
  })
);

// ========== ADMIN RENTAL OPERATIONS ==========

// Tüm kiralamalar (N+1 engellendi: tek JOIN sorgusu)
rentalRouter.get(
  '/rental-operations/admin/all',
  requireRole('superadmin', 'admin', 'editor'),
  asyncHandler(async (_req: any, res) => {
    const formatted = await getEnrichedRentals('ORDER BY r.created_at DESC');
    res.json(formatted);
  })
);

// Admin istatistikleri
rentalRouter.get(
  '/rental-operations/admin/stats',
  requireRole('superadmin', 'admin', 'editor'),
  asyncHandler(async (_req: any, res) => {
    const stats = await getRentalStats();
    res.json(stats);
  })
);

rentalRouter.post('/rental-operations/admin/approve', (req, res) =>
  adminRentalAction(req, res, approveRentalService)
);

rentalRouter.post('/rental-operations/admin/reject', (req, res) =>
  adminRentalAction(req, res, rejectRentalService)
);

rentalRouter.post('/rental-operations/admin/reject-early-return', (req, res) =>
  adminRentalAction(req, res, rejectEarlyReturnService)
);

rentalRouter.post('/rental-operations/admin/approve-extension', (req, res) =>
  adminRentalAction(req, res, approveExtensionService)
);

rentalRouter.post('/rental-operations/admin/reject-extension', (req, res) =>
  adminRentalAction(req, res, rejectExtensionService)
);

rentalRouter.post('/rental-operations/admin/complete', (req, res) =>
  adminRentalAction(req, res, completeRentalService)
);

rentalRouter.post('/rental-operations/admin/approve-early-return', (req, res) =>
  adminRentalAction(req, res, approveEarlyReturnService)
);

rentalRouter.post('/rental-operations/admin/mark-paid', (req, res) =>
  adminRentalAction(req, res, markRentalPaidService)
);

rentalRouter.post('/rental-operations/admin/unmark-paid', (req, res) =>
  adminRentalAction(req, res, unmarkRentalPaidService)
);

// Strapi uyumlu kiralama listeleme (N+1 engellendi)
rentalRouter.get(
  '/rentals',
  asyncHandler(async (req, res) => {
    const filters = req.query?.filters as any;
    if (filters?.rentalStatus?.$notIn) {
      const notIn = Object.values(filters.rentalStatus.$notIn) as string[];
      const placeholders = notIn.map((_, i) => `$${i + 1}`).join(', ');
      const formatted = await getEnrichedRentals(
        `WHERE r.rental_status NOT IN (${placeholders}) ORDER BY r.created_at DESC`,
        notIn
      );
      return res.json({ data: formatted });
    }
    const formatted = await getEnrichedRentals('ORDER BY r.created_at DESC');
    res.json({ data: formatted });
  })
);
