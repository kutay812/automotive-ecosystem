import { Router } from 'express';
import { pool } from '../database/db';
import { rateLimitMiddleware, requireRole } from '../middlewares/auth';
import { now } from '../utils/helpers';

export const supportRouter = Router();

// Public: Destek talebi oluştur
supportRouter.post('/support', rateLimitMiddleware, async (req, res) => {
  try {
    const { name, email, subject, message, userId } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: { message: 'Ad, e-posta, konu ve mesaj alanları zorunludur.' } });
    }

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
supportRouter.get('/admin/support/tickets', requireRole('superadmin', 'admin'), async (req: any, res) => {
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
supportRouter.get('/admin/support/tickets/:id', requireRole('superadmin', 'admin'), async (req: any, res) => {
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
supportRouter.put('/admin/support/tickets/:id', requireRole('superadmin', 'admin'), async (req: any, res) => {
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
