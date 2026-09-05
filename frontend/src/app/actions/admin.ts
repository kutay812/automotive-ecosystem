'use server';

import { cookies } from 'next/headers';
import { revalidateTag, revalidatePath } from 'next/cache';
import { getAdminToken, getAdminUser, hasRole, type AdminRole } from '@/lib/admin-session';

const INTERNAL_API_URL = process.env.INTERNAL_API_URL || 'http://backend:1337';

// ===== AUTH =====
export async function adminLogin(email: string, password: string) {
  try {
    const res = await fetch(`${INTERNAL_API_URL}/api/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data?.error?.message || 'Giriş başarısız.' };

    const cookieStore = await cookies();
    cookieStore.set('admin_token', data.jwt, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 1 gün
    });
    return { success: true, admin: data.admin };
  } catch {
    return { error: 'Sunucuya bağlanılamadı.' };
  }
}

export async function adminLogout() {
  const cookieStore = await cookies();
  cookieStore.delete('admin_token');
  cookieStore.delete('admin_session');
  return { success: true };
}

export async function getAdminName() {
  const admin = await getAdminUser();
  if (!admin) return 'Admin';
  return `${admin.firstName} ${admin.lastName}`.trim() || admin.email;
}

// ===== INTERNAL HELPERS & CORE FETCHER =====
async function adminHeaders(): Promise<Record<string, string>> {
  const token = await getAdminToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function requireAdminRole(...roles: AdminRole[]): Promise<{ error?: string }> {
  const admin = await getAdminUser();
  if (!admin) return { error: 'Oturum süresi dolmuş. Lütfen tekrar giriş yapın.' };
  if (!hasRole(admin, ...roles)) return { error: 'Bu işlem için yetkiniz yok.' };
  return {};
}

interface AdminFetchResult<T = any> {
  success?: boolean;
  data?: T;
  error?: string;
  ok?: boolean;
  [key: string]: any;
}

/**
 * Generic, DRY fetcher for admin operations.
 * Handles role-based access check, headers injection, JSON serialization,
 * error encapsulation, and automatic Next.js tag cache revalidation.
 */
async function adminFetch<T = any>(
  endpoint: string,
  options: RequestInit = {},
  allowedRoles?: AdminRole[],
  tagsToRevalidate?: string[],
  pathsToRevalidate?: string[]
): Promise<AdminFetchResult<T>> {
  if (allowedRoles && allowedRoles.length > 0) {
    const check = await requireAdminRole(...allowedRoles);
    if (check.error) return { error: check.error };
  }

  try {
    const token = await getAdminToken();
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

    const baseHeaders: Record<string, string> = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...((options.headers as Record<string, string>) || {}),
    };

    const res = await fetch(`${INTERNAL_API_URL}${endpoint}`, {
      ...options,
      headers: baseHeaders,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { error: data?.error?.details || data?.error?.message || data?.message || 'İşlem başarısız.' };
    }

    if (tagsToRevalidate) {
      for (const tag of tagsToRevalidate) {
        try {
          (revalidateTag as any)(tag, 'default');
        } catch {}
      }
    }

    if (pathsToRevalidate) {
      for (const p of pathsToRevalidate) {
        try {
          revalidatePath(p);
        } catch {}
      }
    }

    return { success: true, data: data?.data !== undefined ? data.data : data };
  } catch {
    return { error: 'Sunucuya bağlanılamadı.' };
  }
}

// ===== KİRALAMA İŞLEMLERİ =====
async function adminRentalAction(endpoint: string, body: any) {
  const res = await adminFetch(
    `/api/rental-operations/admin/${endpoint}`,
    { method: 'POST', body: JSON.stringify(body) },
    ['superadmin', 'admin'],
    ['rentals', 'cars'],
    ['/admin/kiralamalar', '/rentacar']
  );
  return res.error ? { error: res.error } : { success: true, data: res.data };
}

export async function approveRental(rentalId: string) {
  return adminRentalAction('approve', { rentalId });
}

export async function rejectRental(rentalId: string) {
  return adminRentalAction('reject', { rentalId });
}

export async function approveExtension(rentalId: string) {
  return adminRentalAction('approve-extension', { rentalId });
}

export async function rejectExtension(rentalId: string) {
  return adminRentalAction('reject-extension', { rentalId });
}

export async function completeRental(rentalId: string) {
  return adminRentalAction('complete', { rentalId });
}

export async function approveEarlyReturn(rentalId: string) {
  return adminRentalAction('approve-early-return', { rentalId });
}

export async function rejectEarlyReturn(rentalId: string) {
  return adminRentalAction('reject-early-return', { rentalId });
}

export async function markRentalPaymentPaid(rentalId: string) {
  return adminRentalAction('mark-paid', { rentalId });
}

export async function unmarkRentalPaymentPaid(rentalId: string) {
  return adminRentalAction('unmark-paid', { rentalId });
}

export async function fetchAdminRentals() {
  const res = await adminFetch('/api/rental-operations/admin/all', { cache: 'no-store' }, ['superadmin', 'admin', 'editor']);
  return res.data || [];
}

export async function fetchAdminStats() {
  const res = await adminFetch('/api/rental-operations/admin/stats', { cache: 'no-store' }, ['superadmin', 'admin', 'editor']);
  return res.data || null;
}

// ===== ARAÇ YÖNETİMİ =====
export async function fetchAdminCars() {
  try {
    const res = await fetch(`${INTERNAL_API_URL}/api/cars?populate=*`, {
      next: { tags: ['cars'], revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data?.data || data || [];
  } catch {
    return [];
  }
}

export async function createCar(formData: FormData) {
  const carData = {
    brand: formData.get('brand'),
    model: formData.get('model'),
    year: formData.get('year'),
    pricePerDay: formData.get('pricePerDay'),
    transmission: formData.get('transmission'),
    fuelType: formData.get('fuelType'),
    passengerCount: formData.get('passengerCount'),
    luggageCount: formData.get('luggageCount'),
    imageUrl: formData.get('imageUrl'),
    currentOfficeId: formData.get('currentOfficeId') || null,
    isAvailable: true,
  };

  return adminFetch(
    '/api/cars',
    { method: 'POST', body: JSON.stringify({ data: carData }) },
    ['superadmin', 'admin', 'editor'],
    ['cars'],
    ['/admin/araclar', '/rentacar']
  );
}

export async function updateCar(documentId: string, data: any) {
  return adminFetch(
    `/api/cars/${documentId}`,
    { method: 'PUT', body: JSON.stringify({ data }) },
    ['superadmin', 'admin', 'editor'],
    ['cars'],
    ['/admin/araclar', '/rentacar']
  );
}

export async function deleteCar(documentId: string) {
  return adminFetch(
    `/api/cars/${documentId}`,
    { method: 'DELETE' },
    ['superadmin', 'admin', 'editor'],
    ['cars'],
    ['/admin/araclar', '/rentacar']
  );
}

// ===== KULLANICI YÖNETİMİ =====
export async function fetchAdminUsers() {
  const res = await adminFetch('/api/admin/users', { cache: 'no-store' }, ['superadmin', 'admin']);
  return Array.isArray(res.data) ? res.data : [];
}

export async function updateUser(userId: string, data: any) {
  return adminFetch(
    `/api/admin/users/${userId}`,
    { method: 'PUT', body: JSON.stringify(data) },
    ['superadmin', 'admin'],
    undefined,
    ['/admin/kullanicilar']
  );
}

export async function deleteUser(userId: string) {
  return adminFetch(
    `/api/admin/users/${userId}`,
    { method: 'DELETE' },
    ['superadmin', 'admin'],
    undefined,
    ['/admin/kullanicilar']
  );
}

// ===== ROL YÖNETİMİ =====
export async function fetchAdminRoles() {
  const res = await adminFetch('/api/admin/roles', { cache: 'no-store' }, ['superadmin', 'admin']);
  return Array.isArray(res.data) ? res.data : [];
}

export async function fetchRoleDetail(roleId: number) {
  const res = await adminFetch(`/api/admin/roles/${roleId}`, { cache: 'no-store' }, ['superadmin', 'admin']);
  return res.data || null;
}

export async function fetchPermissions() {
  const res = await adminFetch('/api/admin/permissions', { cache: 'no-store' }, ['superadmin']);
  return res.data || { actions: [], grouped: {} };
}

export async function createRole(name: string, description: string) {
  return adminFetch(
    '/api/admin/roles',
    { method: 'POST', body: JSON.stringify({ name, description }) },
    ['superadmin'],
    undefined,
    ['/admin/roller']
  );
}

export async function updateRole(roleId: number, data: { name?: string; description?: string }) {
  return adminFetch(
    `/api/admin/roles/${roleId}`,
    { method: 'PUT', body: JSON.stringify(data) },
    ['superadmin'],
    undefined,
    ['/admin/roller']
  );
}

export async function deleteRole(roleId: number) {
  return adminFetch(
    `/api/admin/roles/${roleId}`,
    { method: 'DELETE' },
    ['superadmin'],
    undefined,
    ['/admin/roller']
  );
}

export async function updateRolePermissions(roleId: number, actions: string[]) {
  return adminFetch(
    `/api/admin/roles/${roleId}/permissions`,
    { method: 'POST', body: JSON.stringify({ actions }) },
    ['superadmin'],
    undefined,
    ['/admin/roller']
  );
}

export async function assignUsersToRole(roleId: number, userIds: number[]) {
  return adminFetch(
    `/api/admin/roles/${roleId}/users`,
    { method: 'POST', body: JSON.stringify({ userIds }) },
    ['superadmin'],
    undefined,
    ['/admin/roller']
  );
}

// ===== MEDYA YÖNETİMİ =====
export async function fetchAdminMedia() {
  const res = await adminFetch('/api/admin/media', { cache: 'no-store' }, ['superadmin', 'admin', 'editor']);
  return Array.isArray(res.data) ? res.data : [];
}

export async function deleteMedia(fileId: number) {
  return adminFetch(
    `/api/admin/media/${fileId}`,
    { method: 'DELETE' },
    ['superadmin', 'admin', 'editor'],
    undefined,
    ['/admin/medya']
  );
}

export async function uploadMedia(formData: FormData) {
  return adminFetch(
    '/api/admin/media/upload',
    { method: 'POST', body: formData },
    ['superadmin', 'admin', 'editor'],
    undefined,
    ['/admin/medya']
  );
}

// ===== ANASAYFA MEDYA YÖNETİMİ =====
export async function fetchHomepageMedia() {
  try {
    const res = await fetch(`${INTERNAL_API_URL}/api/homepage-media`, {
      next: { tags: ['homepage_media'], revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data?.data || [];
  } catch {
    return [];
  }
}

export async function createHomepageMedia(data: {
  title: string;
  description: string;
  mediaType: string;
  mediaUrl: string;
  thumbnailUrl?: string;
  sortOrder?: number;
}) {
  return adminFetch(
    '/api/admin/homepage-media',
    { method: 'POST', body: JSON.stringify(data) },
    ['superadmin', 'admin', 'editor'],
    ['homepage_media'],
    ['/admin/anasayfa-icerik', '/']
  );
}

export async function updateHomepageMedia(id: number, data: any) {
  return adminFetch(
    `/api/admin/homepage-media/${id}`,
    { method: 'PUT', body: JSON.stringify(data) },
    ['superadmin', 'admin', 'editor'],
    ['homepage_media'],
    ['/admin/anasayfa-icerik', '/']
  );
}

export async function deleteHomepageMedia(id: number) {
  return adminFetch(
    `/api/admin/homepage-media/${id}`,
    { method: 'DELETE' },
    ['superadmin', 'admin', 'editor'],
    ['homepage_media'],
    ['/admin/anasayfa-icerik', '/']
  );
}

// ===== MUHASEBE / FİNANSAL RAPORLAMA =====
export async function fetchFinanceReport(period: string = 'monthly', startDate?: string, endDate?: string) {
  let url = `/api/admin/finance/report?period=${period}`;
  if (period === 'custom' && startDate) {
    url += `&startDate=${encodeURIComponent(startDate)}`;
    if (endDate) url += `&endDate=${encodeURIComponent(endDate)}`;
  }
  const res = await adminFetch(url, { cache: 'no-store' }, ['superadmin', 'admin']);
  return res.data || null;
}

// ===== OFİS YÖNETİMİ =====
export async function fetchAdminOffices() {
  const res = await adminFetch('/api/offices', { next: { tags: ['offices'], revalidate: 300 } });
  return Array.isArray(res.data) ? res.data : [];
}

export async function createOffice(data: {
  name: string;
  city: string;
  address: string;
  phone: string;
  location?: string;
  openingTime?: string;
  closingTime?: string;
}) {
  return adminFetch(
    '/api/admin/offices',
    { method: 'POST', body: JSON.stringify(data) },
    ['superadmin', 'admin', 'editor'],
    ['offices'],
    ['/admin/ofisler', '/ofislerimiz', '/']
  );
}

export async function updateOffice(documentId: string, data: any) {
  return adminFetch(
    `/api/admin/offices/${documentId}`,
    { method: 'PUT', body: JSON.stringify(data) },
    ['superadmin', 'admin', 'editor'],
    ['offices'],
    ['/admin/ofisler', '/ofislerimiz', '/']
  );
}

export async function deleteOffice(documentId: string) {
  return adminFetch(
    `/api/admin/offices/${documentId}`,
    { method: 'DELETE' },
    ['superadmin', 'admin', 'editor'],
    ['offices'],
    ['/admin/ofisler', '/ofislerimiz', '/']
  );
}

// ===== ADMIN PANEL KULLANICI YÖNETİMİ =====
export async function fetchAdminPanelUsers() {
  const res = await adminFetch('/api/admin/panel/users', { cache: 'no-store' }, ['superadmin', 'admin']);
  return Array.isArray(res.data) ? res.data : [];
}

export async function createAdminPanelUser(data: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
}) {
  return adminFetch(
    '/api/admin/panel/users',
    { method: 'POST', body: JSON.stringify(data) },
    ['superadmin', 'admin'],
    undefined,
    ['/admin/kullanicilar']
  );
}

export async function updateAdminPanelUser(userId: string, data: any) {
  const check = await requireAdminRole('superadmin', 'admin');
  if (check.error) return check;

  try {
    const headers = await adminHeaders();
    const res = await fetch(`${INTERNAL_API_URL}/api/admin/panel/users/${userId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) return { error: result?.error?.message || 'Kullanıcı güncellenemedi.' };

    if (result.jwt) {
      const cookieStore = await cookies();
      cookieStore.set('admin_token', result.jwt, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24,
        path: '/',
      });
    }

    revalidatePath('/admin/kullanicilar');
    return { success: true };
  } catch {
    return { error: 'Sunucuya bağlanılamadı.' };
  }
}

export async function deleteAdminPanelUser(userId: string) {
  return adminFetch(
    `/api/admin/panel/users/${userId}`,
    { method: 'DELETE' },
    ['superadmin', 'admin'],
    undefined,
    ['/admin/kullanicilar']
  );
}

// ===== ALIŞVERİŞ YÖNETİMİ =====
export async function fetchShopItems() {
  const res = await adminFetch('/api/admin/shop/items', { next: { tags: ['shop'], revalidate: 60 } });
  return Array.isArray(res.data) ? res.data : [];
}

export async function createShopItem(item: any) {
  return adminFetch(
    '/api/admin/shop/items',
    { method: 'POST', body: JSON.stringify(item) },
    ['superadmin', 'admin', 'editor'],
    ['shop'],
    ['/admin/alisveris', '/alisveris', '/']
  );
}

export async function updateShopItem(id: number, updates: any) {
  return adminFetch(
    `/api/admin/shop/items/${id}`,
    { method: 'PUT', body: JSON.stringify(updates) },
    ['superadmin', 'admin', 'editor'],
    ['shop'],
    ['/admin/alisveris', '/alisveris', '/']
  );
}

export async function deleteShopItem(id: number) {
  return adminFetch(
    `/api/admin/shop/items/${id}`,
    { method: 'DELETE' },
    ['superadmin', 'admin', 'editor'],
    ['shop'],
    ['/admin/alisveris', '/alisveris', '/']
  );
}

export async function syncShopItems() {
  const res = await adminFetch(
    '/api/admin/shop/sync',
    { method: 'POST' },
    ['superadmin', 'admin', 'editor'],
    ['shop'],
    ['/admin/alisveris', '/alisveris', '/']
  );
  return res.data || { ok: false, message: res.error || 'Sunucuya bağlanılamadı.', synced: 0 };
}

export async function fetchShopSettings() {
  const res = await adminFetch('/api/admin/shop/settings', { cache: 'no-store' });
  return Array.isArray(res.data) ? res.data : [];
}

export async function updateShopSettings(settings: any) {
  return adminFetch(
    '/api/admin/shop/settings',
    { method: 'PUT', body: JSON.stringify(settings) },
    ['superadmin', 'admin', 'editor'],
    ['shop'],
    ['/admin/alisveris']
  );
}

// Public Shop Items (Tag-based ISR)
export async function fetchPublicShopItems(filters?: {
  platform?: string;
  category?: string;
  sub_category?: string;
  vehicle_brand?: string;
  vehicle_model?: string;
}) {
  try {
    const params = new URLSearchParams();
    if (filters) {
      if (filters.platform && filters.platform !== 'all') params.set('platform', filters.platform);
      if (filters.category && filters.category !== 'all') params.set('category', filters.category);
      if (filters.sub_category && filters.sub_category !== 'all') params.set('sub_category', filters.sub_category);
      if (filters.vehicle_brand && filters.vehicle_brand !== 'all') params.set('vehicle_brand', filters.vehicle_brand);
      if (filters.vehicle_model && filters.vehicle_model !== 'all') params.set('vehicle_model', filters.vehicle_model);
    }
    const res = await fetch(`${INTERNAL_API_URL}/api/shop/items?${params}`, {
      next: { tags: ['shop'], revalidate: 180 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data?.data || [];
  } catch {
    return [];
  }
}

export async function fetchShopCategories() {
  try {
    const res = await fetch(`${INTERNAL_API_URL}/api/shop/categories`, {
      next: { tags: ['shop_categories'], revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data?.data || [];
  } catch {
    return [];
  }
}

// ===== DESTEK / ŞİKAYET YÖNETİMİ =====
export async function fetchSupportTickets() {
  const res = await adminFetch('/api/admin/support/tickets', { cache: 'no-store' }, ['superadmin', 'admin']);
  return Array.isArray(res.data) ? res.data : [];
}

export async function updateSupportTicketStatus(ticketId: number, status: string) {
  return adminFetch(
    `/api/admin/support/tickets/${ticketId}`,
    { method: 'PUT', body: JSON.stringify({ status }) },
    ['superadmin', 'admin'],
    undefined,
    ['/admin/destek']
  );
}

// ===== PROJE YÖNETİMİ =====
export async function fetchPublicProjects() {
  try {
    const res = await fetch(`${INTERNAL_API_URL}/api/projects?active=true`, {
      next: { tags: ['projects'], revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data?.data || [];
  } catch {
    return [];
  }
}

export async function fetchAdminProjects() {
  const res = await adminFetch(
    '/api/projects',
    { next: { tags: ['projects'], revalidate: 60 } },
    ['superadmin', 'admin', 'editor']
  );
  return Array.isArray(res.data) ? res.data : [];
}

export async function createProject(data: {
  title: string;
  description: string;
  category: string;
  mediaType: string;
  mediaUrl: string;
  thumbnailUrl?: string;
  sortOrder?: number;
}) {
  return adminFetch(
    '/api/admin/projects',
    { method: 'POST', body: JSON.stringify(data) },
    ['superadmin', 'admin', 'editor'],
    ['projects'],
    ['/admin/projelerimiz', '/projelerimiz', '/']
  );
}

export async function updateProject(id: number, data: any) {
  return adminFetch(
    `/api/admin/projects/${id}`,
    { method: 'PUT', body: JSON.stringify(data) },
    ['superadmin', 'admin', 'editor'],
    ['projects'],
    ['/admin/projelerimiz', '/projelerimiz', '/']
  );
}

export async function deleteProject(id: number) {
  return adminFetch(
    `/api/admin/projects/${id}`,
    { method: 'DELETE' },
    ['superadmin', 'admin', 'editor'],
    ['projects'],
    ['/admin/projelerimiz', '/projelerimiz', '/']
  );
}

export async function uploadProjectMedia(formData: FormData) {
  return adminFetch(
    '/api/admin/projects/upload',
    { method: 'POST', body: formData },
    ['superadmin', 'admin', 'editor'],
    ['projects'],
    ['/admin/projelerimiz', '/projelerimiz']
  );
}
