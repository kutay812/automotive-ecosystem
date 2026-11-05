import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { jwtVerify } from 'jose/jwt/verify';

export type AdminRole = 'superadmin' | 'admin' | 'editor';

export interface AdminUser {
  id: number;
  documentId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: AdminRole;
}

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'example-admin-jwt-secret-2026';
const secretKey = new TextEncoder().encode(ADMIN_JWT_SECRET);

export async function getAdminToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('admin_token')?.value || null;
}

export async function getAdminSession(): Promise<boolean> {
  const token = await getAdminToken();
  return !!token;
}

export async function getAdminUser(): Promise<AdminUser | null> {
  const token = await getAdminToken();
  if (!token) return null;

  try {
    // Kriptografik imza ve süre doğrulaması (HMAC SHA-256)
    const { payload } = await jwtVerify(token, secretKey);
    if (!payload.adminId) return null;
    
    // Rol bazlı kontrol
    const ADMIN_ROLES: AdminRole[] = ['superadmin', 'admin', 'editor'];
    if (!payload.role || !ADMIN_ROLES.includes(payload.role as AdminRole)) {
      return null;
    }
    
    return {
      id: Number(payload.adminId),
      documentId: String(payload.documentId || ''),
      email: String(payload.email || ''),
      firstName: String(payload.firstName || ''),
      lastName: String(payload.lastName || ''),
      role: payload.role as AdminRole,
    };
  } catch {
    return null;
  }
}

// Role check helpers
export function hasRole(user: AdminUser | null, ...roles: AdminRole[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

export function isSuperAdmin(user: AdminUser | null): boolean {
  return hasRole(user, 'superadmin');
}

/**
 * Admin Sayfaları için Tekil Yetkilendirme Guard'ı.
 * Oturumu ve rolleri doğrular; geçersizse login veya paneline yönlendirir.
 */
export async function requireAdminPage(...allowedRoles: AdminRole[]): Promise<AdminUser> {
  const admin = await getAdminUser();
  if (!admin) {
    redirect('/admin/login');
  }
  if (allowedRoles.length > 0 && !hasRole(admin, ...allowedRoles)) {
    redirect('/admin');
  }
  return admin;
}

