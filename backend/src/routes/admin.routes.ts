import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../database/db';
import { adminAuthMiddleware, requireRole } from '../middlewares/auth';
import { MANAGEABLE_ADMIN_ROLES } from '../config/env';
import { genDocId, now, signAdminToken } from '../utils/helpers';

export const adminRouter = Router();

// ==========================================
// ========== KULLANICI YÖNETİMİ ==========
// ==========================================

// Tüm site kullanıcılarını listele
adminRouter.get('/admin/users', requireRole('superadmin', 'admin'), async (req: any, res) => {
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
adminRouter.put('/admin/users/:id', requireRole('superadmin', 'admin'), async (req: any, res) => {
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

    if (roleId) {
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
adminRouter.delete('/admin/users/:id', requireRole('superadmin', 'admin'), async (req: any, res) => {
  try {
    const userResult = await pool.query('SELECT id FROM up_users WHERE document_id = $1 OR id::text = $1', [req.params.id]);
    if (userResult.rows.length > 0) {
      const realUserId = userResult.rows[0].id;
      await pool.query('DELETE FROM up_users_role_lnk WHERE user_id = $1', [realUserId]);
      await pool.query('DELETE FROM rentals_user_lnk WHERE user_id = $1', [realUserId]);
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

// Rolleri listele
adminRouter.get('/admin/roles', requireRole('superadmin', 'admin'), async (req: any, res) => {
  try {
    const roles = await pool.query('SELECT * FROM up_roles ORDER BY id');

    const data = await Promise.all(roles.rows.map(async (r: any) => {
      const countResult = await pool.query('SELECT COUNT(*) FROM up_users_role_lnk WHERE role_id = $1', [r.id]);

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

// Tek rol detayı
adminRouter.get('/admin/roles/:id', requireRole('superadmin', 'admin'), async (req: any, res) => {
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

// Tüm izinleri listele
adminRouter.get('/admin/permissions', requireRole('superadmin'), async (req: any, res) => {
  try {
    const perms = await pool.query('SELECT DISTINCT action FROM up_permissions ORDER BY action');

    const grouped: Record<string, string[]> = {};
    for (const p of perms.rows) {
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
adminRouter.post('/admin/roles', requireRole('superadmin'), async (req: any, res) => {
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

// Rol güncelle
adminRouter.put('/admin/roles/:id', requireRole('superadmin'), async (req: any, res) => {
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
adminRouter.delete('/admin/roles/:id', requireRole('superadmin'), async (req: any, res) => {
  try {
    const roleId = parseInt(req.params.id);

    const roleResult = await pool.query('SELECT type FROM up_roles WHERE id = $1', [roleId]);
    if (roleResult.rows.length > 0 && ['authenticated', 'public'].includes(roleResult.rows[0].type)) {
      return res.status(400).json({ error: { message: 'Varsayılan roller silinemez.' } });
    }

    await pool.query('DELETE FROM up_permissions_role_lnk WHERE role_id = $1', [roleId]);
    await pool.query('DELETE FROM up_users_role_lnk WHERE role_id = $1', [roleId]);
    await pool.query('DELETE FROM up_roles WHERE id = $1', [roleId]);

    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Rol izinlerini toplu güncelle
adminRouter.post('/admin/roles/:id/permissions', requireRole('superadmin'), async (req: any, res) => {
  try {
    const roleId = parseInt(req.params.id);
    const { actions } = req.body;

    if (!Array.isArray(actions)) return res.status(400).json({ error: { message: 'actions dizisi gerekli.' } });

    await pool.query('DELETE FROM up_permissions_role_lnk WHERE role_id = $1', [roleId]);

    for (const action of actions) {
      let permResult = await pool.query('SELECT id FROM up_permissions WHERE action = $1', [action]);
      let permId: number;

      if (permResult.rows.length === 0) {
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
adminRouter.post('/admin/roles/:id/users', requireRole('superadmin'), async (req: any, res) => {
  try {
    const roleId = parseInt(req.params.id);
    const { userIds } = req.body;

    if (!Array.isArray(userIds)) return res.status(400).json({ error: { message: 'userIds dizisi gerekli.' } });

    for (const userId of userIds) {
      await pool.query('DELETE FROM up_users_role_lnk WHERE user_id = $1', [userId]);
      await pool.query('INSERT INTO up_users_role_lnk (user_id, role_id) VALUES ($1, $2)', [userId, roleId]);
    }

    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// ==========================================
// ========== ADMIN AUTH & PANEL USERS ==========
// ==========================================

// Admin Login
adminRouter.post('/admin/auth/login', async (req, res) => {
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

// Admin Me
adminRouter.get('/admin/auth/me', adminAuthMiddleware, (req: any, res) => {
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

// Admin User CRUD
adminRouter.get('/admin/panel/users', requireRole('superadmin', 'admin'), async (req: any, res) => {
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

adminRouter.post('/admin/panel/users', requireRole('superadmin', 'admin'), async (req: any, res) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;
    if (!email || !password || !role) return res.status(400).json({ error: { message: 'email, password ve role gerekli.' } });

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

adminRouter.put('/admin/panel/users/:id', requireRole('superadmin', 'admin'), async (req: any, res) => {
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

adminRouter.delete('/admin/panel/users/:id', requireRole('superadmin', 'admin'), async (req: any, res) => {
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
