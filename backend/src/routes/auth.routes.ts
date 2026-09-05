import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { pool } from '../database/db';
import { rateLimitMiddleware } from '../middlewares/auth';
import {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  FRONTEND_URL,
  transporter,
} from '../config/env';
import {
  genDocId,
  signToken,
  signAdminToken,
  now,
  assignDefaultRole,
  formatUser,
} from '../utils/helpers';

export const authRouter = Router();

// E-posta ile giriş
authRouter.post('/auth/local', rateLimitMiddleware, async (req, res) => {
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
authRouter.post('/auth/local/register', rateLimitMiddleware, async (req, res) => {
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
authRouter.post('/auth/forgot-password', rateLimitMiddleware, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: { message: 'E-posta adresi gereklidir.' } });

    const result = await pool.query('SELECT id, first_name FROM up_users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
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
      console.log(`[DEV ONLY] Şifre Sıfırlama Linki: ${resetLink}`);
    }

    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message } });
  }
});

// Şifre Sıfırlama (Reset Password)
authRouter.post('/auth/reset-password', rateLimitMiddleware, async (req, res) => {
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

// ========== GOOGLE OAUTH ==========

// 1. Google'a yönlendir
authRouter.get('/connect/google', (req, res) => {
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
authRouter.get('/connect/google/callback', async (req, res) => {
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

    res.redirect(`${FRONTEND_URL}/callback/google?access_token=${tokenData.access_token}`);
  } catch (e: any) {
    res.status(500).send('OAuth hatası: ' + e.message);
  }
});

// 3. Google access_token ile kullanıcı oluştur/getir
authRouter.get('/auth/google/callback', async (req, res) => {
  try {
    const accessToken = req.query.access_token as string;
    if (!accessToken) return res.status(400).json({ error: { message: 'access_token gerekli.' } });

    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const profile: any = await profileRes.json();
    if (!profile.email) return res.status(400).json({ error: { message: 'Google profili alınamadı.' } });

    let userResult = await pool.query('SELECT * FROM up_users WHERE google_id = $1', [profile.sub]);
    if (userResult.rows.length === 0) {
      userResult = await pool.query('SELECT * FROM up_users WHERE email = $1', [profile.email]);
    }
    let user;

    if (userResult.rows.length > 0) {
      user = userResult.rows[0];
      await pool.query(
        'UPDATE up_users SET google_id = COALESCE($1, google_id), first_name = COALESCE($2, first_name), last_name = COALESCE($3, last_name), username = COALESCE($4, username), updated_at = $5 WHERE id = $6',
        [profile.sub, profile.given_name, profile.family_name || '-', profile.name || profile.email.split('@')[0], now(), user.id]
      );
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

    if (user.blocked) {
      return res.status(403).json({ error: { message: 'Hesabınız yönetici tarafından askıya alınmıştır.' } });
    }

    const token = signToken(user.id, user.document_id);
    const response: any = { jwt: token, user: formatUser(user) };

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
