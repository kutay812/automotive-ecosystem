'use server';

import { cookies } from 'next/headers';
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
  // Also delete legacy cookie
  cookieStore.delete('admin_session');
  return { success: true };
}

export async function getAdminName() {
  const admin = await getAdminUser();
  if (!admin) return 'Admin';
  return `${admin.firstName} ${admin.lastName}`.trim() || admin.email;
}

// ===== INTERNAL HELPERS =====
async function adminHeaders(): Promise<Record<string, string>> {
  const token = await getAdminToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
}

async function requireAdminRole(...roles: AdminRole[]): Promise<{ error?: string }> {
  const admin = await getAdminUser();
  if (!admin) return { error: 'Oturum süresi dolmuş. Lütfen tekrar giriş yapın.' };
  if (!hasRole(admin, ...roles)) return { error: `Bu işlem için yetkiniz yok.` };
  return {};
}

// ===== KİRALAMA İŞLEMLERİ =====
async function adminAction(endpoint: string, body: any) {
  const check = await requireAdminRole('superadmin', 'admin');
  if (check.error) return check;

  const headers = await adminHeaders();
  const res = await fetch(`${INTERNAL_API_URL}/api/rental-operations/admin/${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) return { error: data?.error?.details || data?.error?.message || 'İşlem başarısız.' };
  return { success: true, data };
}

export async function approveRental(rentalId: string) {
  return adminAction('approve', { rentalId });
}

export async function rejectRental(rentalId: string) {
  return adminAction('reject', { rentalId });
}

export async function approveExtension(rentalId: string) {
  return adminAction('approve-extension', { rentalId });
}

export async function rejectExtension(rentalId: string) {
  return adminAction('reject-extension', { rentalId });
}

export async function completeRental(rentalId: string) {
  return adminAction('complete', { rentalId });
}

export async function approveEarlyReturn(rentalId: string) {
  return adminAction('approve-early-return', { rentalId });
}

export async function rejectEarlyReturn(rentalId: string) {
  return adminAction('reject-early-return', { rentalId });
}

export async function markRentalPaymentPaid(rentalId: string) {
  return adminAction('mark-paid', { rentalId });
}

export async function unmarkRentalPaymentPaid(rentalId: string) {
  return adminAction('unmark-paid', { rentalId });
}

// ===== VERİ ÇEKME =====
export async function fetchAdminRentals() {
  try {
    const headers = await adminHeaders();
    const res = await fetch(`${INTERNAL_API_URL}/api/rental-operations/admin/all`, {
      cache: 'no-store',
      headers,
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function fetchAdminStats() {
  try {
    const headers = await adminHeaders();
    const res = await fetch(`${INTERNAL_API_URL}/api/rental-operations/admin/stats`, {
      cache: 'no-store',
      headers,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchAdminCars() {
  try {
    const res = await fetch(`${INTERNAL_API_URL}/api/cars?populate=*`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data?.data || data || [];
  } catch {
    return [];
  }
}

// ===== ARAÇ YÖNETİMİ =====
export async function createCar(formData: FormData) {
  const check = await requireAdminRole('superadmin', 'admin', 'editor');
  if (check.error) return check;

  const carData: any = {
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

  try {
    const res = await fetch(`${INTERNAL_API_URL}/api/cars`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: carData }),
    });
    if (!res.ok) return { error: 'Araç eklenemedi.' };
    return { success: true };
  } catch {
    return { error: 'Sunucuya bağlanılamadı.' };
  }
}

export async function updateCar(documentId: string, data: any) {
  const check = await requireAdminRole('superadmin', 'admin', 'editor');
  if (check.error) return check;

  try {
    const res = await fetch(`${INTERNAL_API_URL}/api/cars/${documentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    });
    if (!res.ok) return { error: 'Araç güncellenemedi.' };
    return { success: true };
  } catch {
    return { error: 'Sunucuya bağlanılamadı.' };
  }
}

export async function deleteCar(documentId: string) {
  const check = await requireAdminRole('superadmin', 'admin', 'editor');
  if (check.error) return check;

  try {
    const res = await fetch(`${INTERNAL_API_URL}/api/cars/${documentId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return { error: 'Araç silinemedi.' };
    return { success: true };
  } catch {
    return { error: 'Sunucuya bağlanılamadı.' };
  }
}

// ===== SİTE KULLANICI YÖNETİMİ (frontend users) =====
export async function fetchAdminUsers() {
  const check = await requireAdminRole('superadmin', 'admin');
  if (check.error) return [];

  try {
    const headers = await adminHeaders();
    const res = await fetch(`${INTERNAL_API_URL}/api/admin/users`, {
      cache: 'no-store',
      headers,
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function updateUser(userId: string, data: any) {
  const check = await requireAdminRole('superadmin', 'admin');
  if (check.error) return check;

  try {
    const headers = await adminHeaders();
    const res = await fetch(`${INTERNAL_API_URL}/api/admin/users/${userId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    if (!res.ok) return { error: 'Kullanıcı güncellenemedi.' };
    return { success: true };
  } catch {
    return { error: 'Sunucuya bağlanılamadı.' };
  }
}

export async function deleteUser(userId: string) {
  const check = await requireAdminRole('superadmin', 'admin');
  if (check.error) return check;

  try {
    const headers = await adminHeaders();
    const res = await fetch(`${INTERNAL_API_URL}/api/admin/users/${userId}`, {
      method: 'DELETE',
      headers,
    });
    if (!res.ok) return { error: 'Kullanıcı silinemedi.' };
    return { success: true };
  } catch {
    return { error: 'Sunucuya bağlanılamadı.' };
  }
}

// ===== ROL YÖNETİMİ =====
export async function fetchAdminRoles() {
  const check = await requireAdminRole('superadmin', 'admin');
  if (check.error) return [];

  try {
    const headers = await adminHeaders();
    const res = await fetch(`${INTERNAL_API_URL}/api/admin/roles`, { cache: 'no-store', headers });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function fetchRoleDetail(roleId: number) {
  const check = await requireAdminRole('superadmin', 'admin');
  if (check.error) return null;

  try {
    const headers = await adminHeaders();
    const res = await fetch(`${INTERNAL_API_URL}/api/admin/roles/${roleId}`, { cache: 'no-store', headers });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchPermissions() {
  const check = await requireAdminRole('superadmin');
  if (check.error) return { actions: [], grouped: {} };

  try {
    const headers = await adminHeaders();
    const res = await fetch(`${INTERNAL_API_URL}/api/admin/permissions`, { cache: 'no-store', headers });
    if (!res.ok) return { actions: [], grouped: {} };
    return await res.json();
  } catch {
    return { actions: [], grouped: {} };
  }
}

export async function createRole(name: string, description: string) {
  const check = await requireAdminRole('superadmin');
  if (check.error) return check;

  try {
    const headers = await adminHeaders();
    const res = await fetch(`${INTERNAL_API_URL}/api/admin/roles`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name, description }),
    });
    if (!res.ok) return { error: 'Rol oluşturulamadı.' };
    return { success: true };
  } catch {
    return { error: 'Sunucuya bağlanılamadı.' };
  }
}

export async function updateRole(roleId: number, data: { name?: string; description?: string }) {
  const check = await requireAdminRole('superadmin');
  if (check.error) return check;

  try {
    const headers = await adminHeaders();
    const res = await fetch(`${INTERNAL_API_URL}/api/admin/roles/${roleId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    if (!res.ok) return { error: 'Rol güncellenemedi.' };
    return { success: true };
  } catch {
    return { error: 'Sunucuya bağlanılamadı.' };
  }
}

export async function deleteRole(roleId: number) {
  const check = await requireAdminRole('superadmin');
  if (check.error) return check;

  try {
    const headers = await adminHeaders();
    const res = await fetch(`${INTERNAL_API_URL}/api/admin/roles/${roleId}`, {
      method: 'DELETE',
      headers,
    });
    const data = await res.json();
    if (!res.ok) return { error: data?.error?.message || 'Rol silinemedi.' };
    return { success: true };
  } catch {
    return { error: 'Sunucuya bağlanılamadı.' };
  }
}

export async function updateRolePermissions(roleId: number, actions: string[]) {
  const check = await requireAdminRole('superadmin');
  if (check.error) return check;

  try {
    const headers = await adminHeaders();
    const res = await fetch(`${INTERNAL_API_URL}/api/admin/roles/${roleId}/permissions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ actions }),
    });
    if (!res.ok) return { error: 'İzinler güncellenemedi.' };
    return { success: true };
  } catch {
    return { error: 'Sunucuya bağlanılamadı.' };
  }
}

export async function assignUsersToRole(roleId: number, userIds: number[]) {
  const check = await requireAdminRole('superadmin');
  if (check.error) return check;

  try {
    const headers = await adminHeaders();
    const res = await fetch(`${INTERNAL_API_URL}/api/admin/roles/${roleId}/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ userIds }),
    });
    if (!res.ok) return { error: 'Kullanıcılar atanamadı.' };
    return { success: true };
  } catch {
    return { error: 'Sunucuya bağlanılamadı.' };
  }
}

// ===== MEDYA YÖNETİMİ =====
export async function fetchAdminMedia() {
  const check = await requireAdminRole('superadmin', 'admin', 'editor');
  if (check.error) return [];

  try {
    const headers = await adminHeaders();
    const res = await fetch(`${INTERNAL_API_URL}/api/admin/media`, { cache: 'no-store', headers });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function deleteMedia(fileId: number) {
  const check = await requireAdminRole('superadmin', 'admin', 'editor');
  if (check.error) return check;

  try {
    const headers = await adminHeaders();
    const res = await fetch(`${INTERNAL_API_URL}/api/admin/media/${fileId}`, {
      method: 'DELETE',
      headers,
    });
    if (!res.ok) return { error: 'Dosya silinemedi.' };
    return { success: true };
  } catch {
    return { error: 'Sunucuya bağlanılamadı.' };
  }
}

export async function uploadMedia(formData: FormData) {
  const check = await requireAdminRole('superadmin', 'admin', 'editor');
  if (check.error) return check;

  try {
    const token = await getAdminToken();
    const res = await fetch(`${INTERNAL_API_URL}/api/admin/media/upload`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) return { error: 'Dosya yüklenemedi.' };
    return { success: true, data: await res.json() };
  } catch {
    return { error: 'Sunucuya bağlanılamadı.' };
  }
}

// ===== ANASAYFA MEDYA YÖNETİMİ =====
export async function fetchHomepageMedia() {
  try {
    const res = await fetch(`${INTERNAL_API_URL}/api/homepage-media`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data?.data || [];
  } catch {
    return [];
  }
}

export async function createHomepageMedia(data: {
  title: string; description: string; mediaType: string;
  mediaUrl: string; thumbnailUrl?: string; sortOrder?: number;
}) {
  const check = await requireAdminRole('superadmin', 'admin', 'editor');
  if (check.error) return check;

  try {
    const headers = await adminHeaders();
    const res = await fetch(`${INTERNAL_API_URL}/api/admin/homepage-media`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    if (!res.ok) return { error: 'Medya eklenemedi.' };
    return { success: true };
  } catch {
    return { error: 'Sunucuya bağlanılamadı.' };
  }
}

export async function updateHomepageMedia(id: number, data: any) {
  const check = await requireAdminRole('superadmin', 'admin', 'editor');
  if (check.error) return check;

  try {
    const headers = await adminHeaders();
    const res = await fetch(`${INTERNAL_API_URL}/api/admin/homepage-media/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    if (!res.ok) return { error: 'Medya güncellenemedi.' };
    return { success: true };
  } catch {
    return { error: 'Sunucuya bağlanılamadı.' };
  }
}

export async function deleteHomepageMedia(id: number) {
  const check = await requireAdminRole('superadmin', 'admin', 'editor');
  if (check.error) return check;

  try {
    const headers = await adminHeaders();
    const res = await fetch(`${INTERNAL_API_URL}/api/admin/homepage-media/${id}`, {
      method: 'DELETE',
      headers,
    });
    if (!res.ok) return { error: 'Medya silinemedi.' };
    return { success: true };
  } catch {
    return { error: 'Sunucuya bağlanılamadı.' };
  }
}

// ===== MUHASEBE / FİNANSAL RAPORLAMA =====
export async function fetchFinanceReport(period: string = 'monthly', startDate?: string, endDate?: string) {
  const check = await requireAdminRole('superadmin', 'admin');
  if (check.error) return null;

  try {
    const headers = await adminHeaders();
    let url = `${INTERNAL_API_URL}/api/admin/finance/report?period=${period}`;
    if (period === 'custom' && startDate) {
      url += `&startDate=${encodeURIComponent(startDate)}`;
      if (endDate) {
        url += `&endDate=${encodeURIComponent(endDate)}`;
      }
    }

    const res = await fetch(url, {
      cache: 'no-store',
      headers,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ===== OFİS YÖNETİMİ =====
export async function fetchAdminOffices() {
  try {
    const res = await fetch(`${INTERNAL_API_URL}/api/offices`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data?.data || [];
  } catch {
    return [];
  }
}

export async function createOffice(data: { name: string; city: string; address: string; phone: string; location?: string; openingTime?: string; closingTime?: string }) {
  const check = await requireAdminRole('superadmin', 'admin', 'editor');
  if (check.error) return check;

  try {
    const headers = await adminHeaders();
    const res = await fetch(`${INTERNAL_API_URL}/api/admin/offices`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    if (!res.ok) return { error: 'Ofis eklenemedi.' };
    return { success: true };
  } catch {
    return { error: 'Sunucuya bağlanılamadı.' };
  }
}

export async function updateOffice(documentId: string, data: any) {
  const check = await requireAdminRole('superadmin', 'admin', 'editor');
  if (check.error) return check;

  try {
    const headers = await adminHeaders();
    const res = await fetch(`${INTERNAL_API_URL}/api/admin/offices/${documentId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    if (!res.ok) return { error: 'Ofis güncellenemedi.' };
    return { success: true };
  } catch {
    return { error: 'Sunucuya bağlanılamadı.' };
  }
}

export async function deleteOffice(documentId: string) {
  const check = await requireAdminRole('superadmin', 'admin', 'editor');
  if (check.error) return check;

  try {
    const headers = await adminHeaders();
    const res = await fetch(`${INTERNAL_API_URL}/api/admin/offices/${documentId}`, {
      method: 'DELETE',
      headers,
    });
    if (!res.ok) return { error: 'Ofis silinemedi.' };
    return { success: true };
  } catch {
    return { error: 'Sunucuya bağlanılamadı.' };
  }
}

// ===== ADMIN PANEL KULLANICI YÖNETİMİ (admin_users tablosu) =====
export async function fetchAdminPanelUsers() {
  const check = await requireAdminRole('superadmin', 'admin');
  if (check.error) return [];

  try {
    const headers = await adminHeaders();
    const res = await fetch(`${INTERNAL_API_URL}/api/admin/panel/users`, { cache: 'no-store', headers });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function createAdminPanelUser(data: { firstName: string; lastName: string; email: string; password: string; role: string }) {
  const check = await requireAdminRole('superadmin', 'admin');
  if (check.error) return check;

  try {
    const headers = await adminHeaders();
    const res = await fetch(`${INTERNAL_API_URL}/api/admin/panel/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) return { error: result?.error?.message || 'Kullanıcı eklenemedi.' };
    return { success: true, data: result };
  } catch {
    return { error: 'Sunucuya bağlanılamadı.' };
  }
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

    // If new JWT returned (self-update), refresh the cookie
    if (result.jwt) {
      const cookieStore = await cookies();
      cookieStore.set('admin_token', result.jwt, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 24 hours
        path: '/',
      });
    }

    return { success: true };
  } catch {
    return { error: 'Sunucuya bağlanılamadı.' };
  }
}

export async function deleteAdminPanelUser(userId: string) {
  const check = await requireAdminRole('superadmin', 'admin');
  if (check.error) return check;

  try {
    const headers = await adminHeaders();
    const res = await fetch(`${INTERNAL_API_URL}/api/admin/panel/users/${userId}`, {
      method: 'DELETE',
      headers,
    });
    const result = await res.json();
    if (!res.ok) return { error: result?.error?.message || 'Kullanıcı silinemedi.' };
    return { success: true };
  } catch {
    return { error: 'Sunucuya bağlanılamadı.' };
  }
}

// ===== ALIŞVERİŞ YÖNETİMİ =====
export async function fetchShopItems() {
  try {
    const headers = await adminHeaders();
    const res = await fetch(`${INTERNAL_API_URL}/api/admin/shop/items`, { headers, cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data?.data || [];
  } catch {
    return [];
  }
}

export async function createShopItem(item: any) {
  try {
    const headers = await adminHeaders();
    const res = await fetch(`${INTERNAL_API_URL}/api/admin/shop/items`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    const data = await res.json();
    if (!res.ok) return { error: data?.error?.message || 'Ürün eklenemedi.' };
    return { success: true, data: data.data };
  } catch {
    return { error: 'Sunucuya bağlanılamadı.' };
  }
}

export async function updateShopItem(id: number, updates: any) {
  try {
    const headers = await adminHeaders();
    const res = await fetch(`${INTERNAL_API_URL}/api/admin/shop/items/${id}`, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) return { error: data?.error?.message || 'Ürün güncellenemedi.' };
    return { success: true };
  } catch {
    return { error: 'Sunucuya bağlanılamadı.' };
  }
}

export async function deleteShopItem(id: number) {
  try {
    const headers = await adminHeaders();
    const res = await fetch(`${INTERNAL_API_URL}/api/admin/shop/items/${id}`, {
      method: 'DELETE',
      headers,
    });
    if (!res.ok) return { error: 'Ürün silinemedi.' };
    return { success: true };
  } catch {
    return { error: 'Sunucuya bağlanılamadı.' };
  }
}

export async function syncShopItems() {
  try {
    const headers = await adminHeaders();
    const res = await fetch(`${INTERNAL_API_URL}/api/admin/shop/sync`, {
      method: 'POST',
      headers,
    });
    return await res.json();
  } catch {
    return { ok: false, message: 'Sunucuya bağlanılamadı.', synced: 0 };
  }
}

export async function fetchShopSettings() {
  try {
    const headers = await adminHeaders();
    const res = await fetch(`${INTERNAL_API_URL}/api/admin/shop/settings`, { headers, cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data?.data || [];
  } catch {
    return [];
  }
}

export async function updateShopSettings(settings: any) {
  try {
    const headers = await adminHeaders();
    const res = await fetch(`${INTERNAL_API_URL}/api/admin/shop/settings`, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    const data = await res.json();
    if (!res.ok) return { error: data?.error?.message || 'Ayarlar güncellenemedi.' };
    return { success: true };
  } catch {
    return { error: 'Sunucuya bağlanılamadı.' };
  }
}

// Public: Aktif ürünleri getir (SSR)
export async function fetchPublicShopItems(filters?: { platform?: string; category?: string; sub_category?: string; vehicle_brand?: string; vehicle_model?: string }) {
  try {
    const params = new URLSearchParams();
    if (filters) {
      if (filters.platform && filters.platform !== 'all') params.set('platform', filters.platform);
      if (filters.category && filters.category !== 'all') params.set('category', filters.category);
      if (filters.sub_category && filters.sub_category !== 'all') params.set('sub_category', filters.sub_category);
      if (filters.vehicle_brand && filters.vehicle_brand !== 'all') params.set('vehicle_brand', filters.vehicle_brand);
      if (filters.vehicle_model && filters.vehicle_model !== 'all') params.set('vehicle_model', filters.vehicle_model);
    }
    const res = await fetch(`${INTERNAL_API_URL}/api/shop/items?${params}`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data?.data || [];
  } catch {
    return [];
  }
}

export async function fetchShopCategories() {
  try {
    const res = await fetch(`${INTERNAL_API_URL}/api/shop/categories`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data?.data || [];
  } catch {
    return [];
  }
}

// ===== DESTEK / ŞİKAYET YÖNETİMİ =====
export async function fetchSupportTickets() {
  const check = await requireAdminRole('superadmin', 'admin');
  if (check.error) return [];

  try {
    const headers = await adminHeaders();
    const res = await fetch(`${INTERNAL_API_URL}/api/admin/support/tickets`, { cache: 'no-store', headers });
    if (!res.ok) return [];
    const data = await res.json();
    return data?.data || [];
  } catch {
    return [];
  }
}

export async function updateSupportTicketStatus(ticketId: number, status: string) {
  const check = await requireAdminRole('superadmin', 'admin');
  if (check.error) return check;

  try {
    const headers = await adminHeaders();
    const res = await fetch(`${INTERNAL_API_URL}/api/admin/support/tickets/${ticketId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { error: data?.error?.message || 'Statü güncellenemedi.' };
    }
    return { success: true };
  } catch {
    return { error: 'Sunucuya bağlanılamadı.' };
  }
}

// ===== PROJE YÖNETİMİ =====
export async function fetchPublicProjects() {
  try {
    const res = await fetch(`${INTERNAL_API_URL}/api/projects?active=true`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return data?.data || [];
  } catch {
    return [];
  }
}

export async function fetchAdminProjects() {
  const check = await requireAdminRole('superadmin', 'admin', 'editor');
  if (check.error) return [];

  try {
    const headers = await adminHeaders();
    const res = await fetch(`${INTERNAL_API_URL}/api/projects`, { cache: 'no-store', headers });
    if (!res.ok) return [];
    const data = await res.json();
    return data?.data || [];
  } catch {
    return [];
  }
}

export async function createProject(data: {
  title: string; description: string; category: string;
  mediaType: string; mediaUrl: string; thumbnailUrl?: string; sortOrder?: number;
}) {
  const check = await requireAdminRole('superadmin', 'admin', 'editor');
  if (check.error) return check;

  try {
    const headers = await adminHeaders();
    const res = await fetch(`${INTERNAL_API_URL}/api/admin/projects`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { error: errData?.error?.message || 'Proje eklenemedi.' };
    }
    return { success: true };
  } catch {
    return { error: 'Sunucuya bağlanılamadı.' };
  }
}

export async function updateProject(id: number, data: any) {
  const check = await requireAdminRole('superadmin', 'admin', 'editor');
  if (check.error) return check;

  try {
    const headers = await adminHeaders();
    const res = await fetch(`${INTERNAL_API_URL}/api/admin/projects/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    if (!res.ok) return { error: 'Proje güncellenemedi.' };
    return { success: true };
  } catch {
    return { error: 'Sunucuya bağlanılamadı.' };
  }
}

export async function deleteProject(id: number) {
  const check = await requireAdminRole('superadmin', 'admin', 'editor');
  if (check.error) return check;

  try {
    const headers = await adminHeaders();
    const res = await fetch(`${INTERNAL_API_URL}/api/admin/projects/${id}`, {
      method: 'DELETE',
      headers,
    });
    if (!res.ok) return { error: 'Proje silinemedi.' };
    return { success: true };
  } catch {
    return { error: 'Sunucuya bağlanılamadı.' };
  }
}

export async function uploadProjectMedia(formData: FormData) {
  const check = await requireAdminRole('superadmin', 'admin', 'editor');
  if (check.error) return check;

  try {
    const token = await getAdminToken();
    const res = await fetch(`${INTERNAL_API_URL}/api/admin/projects/upload`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) return { error: 'Dosya yüklenemedi.' };
    return { success: true, data: await res.json() };
  } catch {
    return { error: 'Sunucuya bağlanılamadı.' };
  }
}
