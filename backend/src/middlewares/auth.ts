import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { JWT_SECRET, ADMIN_JWT_SECRET, ADMIN_SECRET, AdminRole } from '../config/env';
import { pool } from '../database/db';

// Global Input Sanitization Middleware (XSS Protection)
export function sanitizeInput(req: any, res: any, next: any) {
  if (req.body && typeof req.body === 'object') {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].replace(/<[^>]*>?/gm, '').trim();
      }
    }
  }
  next();
}

// Rate Limiter Middleware
export const rateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per `window`
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { error: { message: 'Çok fazla istek gönderdiniz. Lütfen 15 dakika sonra tekrar deneyin.' } }
});

// Admin Auth Middleware — Extracts admin user from JWT, attaches to req.admin
export function adminAuthMiddleware(req: any, res: any, next: any) {
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
  // Legacy fallback: secret-based auth
  const secret = req.body?.secret || req.query?.secret;
  if (secret === ADMIN_SECRET) {
    req.admin = { role: 'superadmin' }; // Legacy: full access
    return next();
  }
  return res.status(401).json({ error: { message: 'Yetkilendirme gerekli.' } });
}

// Role Guard Factory — restricts access to specific admin roles
export function requireRole(...allowedRoles: AdminRole[]) {
  return (req: any, res: any, next: any) => {
    adminAuthMiddleware(req, res, () => {
      if (!allowedRoles.includes(req.admin?.role)) {
        return res.status(403).json({ error: { message: `Bu işlem için yetkiniz yok. Gerekli roller: ${allowedRoles.join(', ')}` } });
      }
      next();
    });
  };
}

// JWT Middleware (★ Anlık engel kontrolü ile)
export async function authMiddleware(req: any, res: any, next: any) {
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
