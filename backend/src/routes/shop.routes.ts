import { Router } from 'express';
import { pool } from '../database/db';
import { requireRole } from '../middlewares/auth';
import { getCache, setCache, invalidateCache } from '../config/redis';

export const shopRouter = Router();

// Public: Aktif ürünleri listele
shopRouter.get('/shop/items', async (req, res) => {
  try {
    const platform = req.query.platform as string;
    const category = req.query.category as string;
    const sub_category = req.query.sub_category as string;
    const vehicle_brand = req.query.vehicle_brand as string;
    const vehicle_model = req.query.vehicle_model as string;

    const cacheKey = `shop:items:${platform || 'all'}:${category || 'all'}:${sub_category || 'all'}:${vehicle_brand || 'all'}:${vehicle_model || 'all'}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

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
    const responsePayload = { data: result.rows };

    // 10 dakika önbellekle
    await setCache(cacheKey, responsePayload, 600);

    res.json(responsePayload);
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Admin: Tüm ürünleri listele
shopRouter.get('/admin/shop/items', requireRole('superadmin', 'admin'), async (req: any, res) => {
  try {
    const result = await pool.query('SELECT * FROM shop_items ORDER BY created_at DESC');
    res.json({ data: result.rows });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Admin: Ürün ekle
shopRouter.post('/admin/shop/items', requireRole('superadmin', 'admin'), async (req: any, res) => {
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

    await invalidateCache('shop:*');

    res.json({ data: result.rows[0] });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Admin: Ürün güncelle
shopRouter.put('/admin/shop/items/:id', requireRole('superadmin', 'admin'), async (req: any, res) => {
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

    await invalidateCache('shop:*');

    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Admin: Ürün sil
shopRouter.delete('/admin/shop/items/:id', requireRole('superadmin', 'admin'), async (req: any, res) => {
  try {
    await pool.query('DELETE FROM shop_items WHERE id = $1', [req.params.id]);

    await invalidateCache('shop:*');

    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Admin: Pazaryeri ayarları getir
shopRouter.get('/admin/shop/settings', requireRole('superadmin', 'admin'), async (req: any, res) => {
  try {
    const result = await pool.query('SELECT * FROM marketplace_settings ORDER BY platform');
    res.json({ data: result.rows });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Admin: Pazaryeri ayarı güncelle/oluştur
shopRouter.put('/admin/shop/settings', requireRole('superadmin', 'admin'), async (req: any, res) => {
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

// Admin: Senkronizasyon (stub)
shopRouter.post('/admin/shop/sync', requireRole('superadmin', 'admin'), async (req: any, res) => {
  try {
    const settings = await pool.query('SELECT * FROM marketplace_settings WHERE is_enabled = true');
    if (settings.rows.length === 0) {
      return res.json({
        ok: false,
        message: 'Aktif pazaryeri entegrasyonu bulunamadı. Lütfen önce Pazaryeri Ayarları bölümünden API anahtarlarınızı girin.',
        synced: 0
      });
    }

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
shopRouter.get('/shop/categories', async (req, res) => {
  try {
    const cacheKey = 'shop:categories';
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const result = await pool.query("SELECT DISTINCT category FROM shop_items WHERE is_active = true AND category != '' AND category IS NOT NULL ORDER BY category");
    const responsePayload = { data: result.rows.map((r: any) => r.category) };

    await setCache(cacheKey, responsePayload, 1800);

    res.json(responsePayload);
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// ========== E-TİCARET SİPARİŞLERİ ==========

// Admin: Sipariş oluştur (manuel satış kaydı)
shopRouter.post('/admin/shop/orders', requireRole('superadmin', 'admin'), async (req: any, res) => {
  try {
    const { shop_item_id, customer_name, customer_email, quantity, payment_type, notes } = req.body;
    if (!customer_name) return res.status(400).json({ error: { message: 'Müşteri adı gerekli.' } });

    const q = Math.max(1, parseInt(quantity) || 1);
    let finalUnitPrice = parseFloat(req.body.unit_price) || 0;

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
shopRouter.get('/admin/shop/orders', requireRole('superadmin', 'admin'), async (req: any, res) => {
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
shopRouter.put('/admin/shop/orders/:id/cancel', requireRole('superadmin', 'admin'), async (req: any, res) => {
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
