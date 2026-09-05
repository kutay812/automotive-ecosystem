import nodemailer from 'nodemailer';

export const PORT = parseInt(process.env.PORT || '1337');
export const JWT_SECRET = process.env.JWT_SECRET || 'example-jwt-secret-2026';
export const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'example-admin-jwt-secret-2026';
export const ADMIN_SECRET = 'example-secret-google-123';

export type AdminRole = 'superadmin' | 'admin' | 'editor';
export const MANAGEABLE_ADMIN_ROLES: Exclude<AdminRole, 'superadmin'>[] = ['admin', 'editor'];

export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
export const GOOGLE_REDIRECT_URI = `http://localhost:${PORT}/api/connect/google/callback`;
export const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
export const PAYMENT_WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET || 'example-payment-secret-2026';

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
export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587'),
  auth: {
    user: process.env.SMTP_USER || 'ethereal_user',
    pass: process.env.SMTP_PASS || 'ethereal_pass',
  },
});
