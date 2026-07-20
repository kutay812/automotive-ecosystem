import { cookies } from 'next/headers';

export type AdminRole = 'superadmin' | 'admin' | 'editor';

export interface AdminUser {
  id: number;
  documentId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: AdminRole;
}

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
    // Decode JWT payload (base64) without verification — backend validates on each API call
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    if (!payload.adminId) return null;
    
    // Rol bazlı ekstra güvenlik kontrolü
    const ADMIN_ROLES: AdminRole[] = ['superadmin', 'admin', 'editor'];
    if (!payload.role || !ADMIN_ROLES.includes(payload.role)) {
      return null;
    }
    
    return {
      id: payload.adminId,
      documentId: payload.documentId,
      email: payload.email,
      firstName: payload.firstName || '',
      lastName: payload.lastName || '',
      role: payload.role,
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
