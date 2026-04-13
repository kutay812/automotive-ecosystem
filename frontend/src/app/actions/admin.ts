'use server';

import { cookies } from 'next/headers';

const INTERNAL_API_URL = process.env.INTERNAL_API_URL || 'http://backend:1337';
const SECRET = 'visionarc-secret-google-123';

// Admin kimlik bilgileri (env veya sabit)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'kutaytosun755@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '05054475361Kg.';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Kutay Tosun';

// ===== AUTH =====
export async function adminLogin(email: string, password: string) {
  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    return { error: 'E-posta veya şifre hatalı.' };
  }

  const cookieStore = await cookies();
  cookieStore.set('admin_session', 'authenticated', {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 1 gün
  });
  return { success: true };
}

export async function adminLogout() {
  const cookieStore = await cookies();
  cookieStore.delete('admin_session');
  return { success: true };
}

export async function getAdminName() {
  return ADMIN_NAME;
}

// ===== KİRALAMA İŞLEMLERİ =====
async function adminAction(endpoint: string, body: any) {
  const res = await fetch(`${INTERNAL_API_URL}/api/rental-operations/admin/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: SECRET, ...body }),
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

// ===== VERİ ÇEKME =====
export async function fetchAdminRentals() {
  try {
    const res = await fetch(`${INTERNAL_API_URL}/api/rental-operations/admin/all?secret=${SECRET}`, { cache: 'no-store' });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function fetchAdminStats() {
  try {
    const res = await fetch(`${INTERNAL_API_URL}/api/rental-operations/admin/stats?secret=${SECRET}`, { cache: 'no-store' });
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
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session')?.value;
  if (session !== 'authenticated') return { error: 'Yetki yok.' };

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
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session')?.value;
  if (session !== 'authenticated') return { error: 'Yetki yok.' };

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
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session')?.value;
  if (session !== 'authenticated') return { error: 'Yetki yok.' };

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

// ===== KULLANICI YÖNETİMİ =====
export async function fetchAdminUsers() {
  try {
    const res = await fetch(`${INTERNAL_API_URL}/api/admin/users?secret=${SECRET}`, { cache: 'no-store' });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function updateUser(userId: string, data: any) {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session')?.value;
  if (session !== 'authenticated') return { error: 'Yetki yok.' };

  try {
    const res = await fetch(`${INTERNAL_API_URL}/api/admin/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: SECRET, ...data }),
    });
    if (!res.ok) return { error: 'Kullanıcı güncellenemedi.' };
    return { success: true };
  } catch {
    return { error: 'Sunucuya bağlanılamadı.' };
  }
}

export async function deleteUser(userId: string) {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session')?.value;
  if (session !== 'authenticated') return { error: 'Yetki yok.' };

  try {
    const res = await fetch(`${INTERNAL_API_URL}/api/admin/users/${userId}?secret=${SECRET}`, {
      method: 'DELETE',
    });
    if (!res.ok) return { error: 'Kullanıcı silinemedi.' };
    return { success: true };
  } catch {
    return { error: 'Sunucuya bağlanılamadı.' };
  }
}

// ===== ROL YÖNETİMİ =====
export async function fetchAdminRoles() {
  try {
    const res = await fetch(`${INTERNAL_API_URL}/api/admin/roles?secret=${SECRET}`, { cache: 'no-store' });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function fetchRoleDetail(roleId: number) {
  try {
    const res = await fetch(`${INTERNAL_API_URL}/api/admin/roles/${roleId}?secret=${SECRET}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchPermissions() {
  try {
    const res = await fetch(`${INTERNAL_API_URL}/api/admin/permissions?secret=${SECRET}`, { cache: 'no-store' });
    if (!res.ok) return { actions: [], grouped: {} };
    return await res.json();
  } catch {
    return { actions: [], grouped: {} };
  }
}

export async function createRole(name: string, description: string) {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session')?.value;
  if (session !== 'authenticated') return { error: 'Yetki yok.' };

  try {
    const res = await fetch(`${INTERNAL_API_URL}/api/admin/roles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: SECRET, name, description }),
    });
    if (!res.ok) return { error: 'Rol oluşturulamadı.' };
    return { success: true };
  } catch {
    return { error: 'Sunucuya bağlanılamadı.' };
  }
}

export async function updateRole(roleId: number, data: { name?: string; description?: string }) {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session')?.value;
  if (session !== 'authenticated') return { error: 'Yetki yok.' };

  try {
    const res = await fetch(`${INTERNAL_API_URL}/api/admin/roles/${roleId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: SECRET, ...data }),
    });
    if (!res.ok) return { error: 'Rol güncellenemedi.' };
    return { success: true };
  } catch {
    return { error: 'Sunucuya bağlanılamadı.' };
  }
}

export async function deleteRole(roleId: number) {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session')?.value;
  if (session !== 'authenticated') return { error: 'Yetki yok.' };

  try {
    const res = await fetch(`${INTERNAL_API_URL}/api/admin/roles/${roleId}?secret=${SECRET}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok) return { error: data?.error?.message || 'Rol silinemedi.' };
    return { success: true };
  } catch {
    return { error: 'Sunucuya bağlanılamadı.' };
  }
}

export async function updateRolePermissions(roleId: number, actions: string[]) {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session')?.value;
  if (session !== 'authenticated') return { error: 'Yetki yok.' };

  try {
    const res = await fetch(`${INTERNAL_API_URL}/api/admin/roles/${roleId}/permissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: SECRET, actions }),
    });
    if (!res.ok) return { error: 'İzinler güncellenemedi.' };
    return { success: true };
  } catch {
    return { error: 'Sunucuya bağlanılamadı.' };
  }
}

export async function assignUsersToRole(roleId: number, userIds: number[]) {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session')?.value;
  if (session !== 'authenticated') return { error: 'Yetki yok.' };

  try {
    const res = await fetch(`${INTERNAL_API_URL}/api/admin/roles/${roleId}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: SECRET, userIds }),
    });
    if (!res.ok) return { error: 'Kullanıcılar atanamadı.' };
    return { success: true };
  } catch {
    return { error: 'Sunucuya bağlanılamadı.' };
  }
}

// ===== MEDYA YÖNETİMİ =====
export async function fetchAdminMedia() {
  try {
    const res = await fetch(`${INTERNAL_API_URL}/api/admin/media?secret=${SECRET}`, { cache: 'no-store' });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function deleteMedia(fileId: number) {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session')?.value;
  if (session !== 'authenticated') return { error: 'Yetki yok.' };

  try {
    const res = await fetch(`${INTERNAL_API_URL}/api/admin/media/${fileId}?secret=${SECRET}`, {
      method: 'DELETE',
    });
    if (!res.ok) return { error: 'Dosya silinemedi.' };
    return { success: true };
  } catch {
    return { error: 'Sunucuya bağlanılamadı.' };
  }
}

export async function uploadMedia(formData: FormData) {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session')?.value;
  if (session !== 'authenticated') return { error: 'Yetki yok.' };

  try {
    formData.append('secret', SECRET);
    const res = await fetch(`${INTERNAL_API_URL}/api/admin/media/upload`, {
      method: 'POST',
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
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session')?.value;
  if (session !== 'authenticated') return { error: 'Yetki yok.' };

  try {
    const res = await fetch(`${INTERNAL_API_URL}/api/admin/homepage-media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: SECRET, ...data }),
    });
    if (!res.ok) return { error: 'Medya eklenemedi.' };
    return { success: true };
  } catch {
    return { error: 'Sunucuya bağlanılamadı.' };
  }
}

export async function updateHomepageMedia(id: number, data: any) {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session')?.value;
  if (session !== 'authenticated') return { error: 'Yetki yok.' };

  try {
    const res = await fetch(`${INTERNAL_API_URL}/api/admin/homepage-media/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: SECRET, ...data }),
    });
    if (!res.ok) return { error: 'Medya güncellenemedi.' };
    return { success: true };
  } catch {
    return { error: 'Sunucuya bağlanılamadı.' };
  }
}

export async function deleteHomepageMedia(id: number) {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session')?.value;
  if (session !== 'authenticated') return { error: 'Yetki yok.' };

  try {
    const res = await fetch(`${INTERNAL_API_URL}/api/admin/homepage-media/${id}?secret=${SECRET}`, {
      method: 'DELETE',
    });
    if (!res.ok) return { error: 'Medya silinemedi.' };
    return { success: true };
  } catch {
    return { error: 'Sunucuya bağlanılamadı.' };
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

export async function createOffice(data: { name: string; city: string; address: string; phone: string }) {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session')?.value;
  if (session !== 'authenticated') return { error: 'Yetki yok.' };

  try {
    const res = await fetch(`${INTERNAL_API_URL}/api/admin/offices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: SECRET, ...data }),
    });
    if (!res.ok) return { error: 'Ofis eklenemedi.' };
    return { success: true };
  } catch {
    return { error: 'Sunucuya bağlanılamadı.' };
  }
}

export async function updateOffice(documentId: string, data: any) {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session')?.value;
  if (session !== 'authenticated') return { error: 'Yetki yok.' };

  try {
    const res = await fetch(`${INTERNAL_API_URL}/api/admin/offices/${documentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: SECRET, ...data }),
    });
    if (!res.ok) return { error: 'Ofis güncellenemedi.' };
    return { success: true };
  } catch {
    return { error: 'Sunucuya bağlanılamadı.' };
  }
}

export async function deleteOffice(documentId: string) {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session')?.value;
  if (session !== 'authenticated') return { error: 'Yetki yok.' };

  try {
    const res = await fetch(`${INTERNAL_API_URL}/api/admin/offices/${documentId}?secret=${SECRET}`, {
      method: 'DELETE',
    });
    if (!res.ok) return { error: 'Ofis silinemedi.' };
    return { success: true };
  } catch {
    return { error: 'Sunucuya bağlanılamadı.' };
  }
}
