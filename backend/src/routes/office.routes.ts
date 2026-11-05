import { Router } from 'express';
import { pool } from '../database/db';
import { requireRole } from '../middlewares/auth';
import { genDocId, now, buildUpdateQuery } from '../utils/helpers';
import { asyncHandler } from '../middlewares/asyncHandler';
import { getCache, setCache, invalidateCache } from '../config/redis';

export const officeRouter = Router();

officeRouter.get('/offices', async (req, res) => {
  try {
    const filters = req.query?.filters as any;
    const isActiveFilter = filters?.isActive?.$eq === 'true';
    const cacheKey = isActiveFilter ? 'offices:active' : 'offices:all';

    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    let query = 'SELECT * FROM offices WHERE published_at IS NOT NULL';
    if (isActiveFilter) query += ' AND is_active = true';
    const result = await pool.query(query + ' ORDER BY id');
    const data = result.rows.map(r => ({
      id: r.id, documentId: r.document_id, name: r.name, city: r.city,
      isActive: r.is_active, address: r.address, phone: r.phone,
      location: r.location || null,
      openingTime: r.opening_time || null,
      closingTime: r.closing_time || null,
    }));
    const responsePayload = { data };

    // 1 saat önbellekle
    await setCache(cacheKey, responsePayload, 3600);

    res.json(responsePayload);
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Admin: ofis ekle
officeRouter.post('/admin/offices', requireRole('superadmin', 'admin'), async (req: any, res) => {
  try {
    const { name, city, address, phone, location, openingTime, closingTime } = req.body;

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

    await invalidateCache('offices:*');

    res.json({ ok: true, data: result.rows[0] });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Admin: ofis güncelle
officeRouter.put('/admin/offices/:id', requireRole('superadmin', 'admin'), async (req: any, res) => {
  try {
    const { name, city, address, phone, isActive, location, openingTime, closingTime } = req.body;

    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (openingTime !== undefined && openingTime && !timeRegex.test(openingTime)) {
      return res.status(400).json({ error: { message: 'Açılış saati HH:mm formatında olmalıdır (Örn: 09:00).' } });
    }
    if (closingTime !== undefined && closingTime && !timeRegex.test(closingTime)) {
      return res.status(400).json({ error: { message: 'Kapanış saati HH:mm formatında olmalıdır (Örn: 18:00).' } });
    }

    const query = buildUpdateQuery(
      'offices',
      {
        name,
        city,
        address,
        phone,
        is_active: isActive,
        location,
        opening_time: openingTime,
        closing_time: closingTime,
      },
      'document_id =  OR id::text = ',
      [req.params.id]
    );

    await pool.query(query.text, query.values);

    await invalidateCache('offices:*');

    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Admin: ofis sil
officeRouter.delete('/admin/offices/:id', requireRole('superadmin', 'admin'), async (req: any, res) => {
  try {
    await pool.query('DELETE FROM offices WHERE document_id = $1 OR id::text = $1', [req.params.id]);

    await invalidateCache('offices:*');

    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});
