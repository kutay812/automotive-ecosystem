'use server';

import { getUser } from '@/lib/session';

const INTERNAL_API_URL = process.env.INTERNAL_API_URL || 'http://backend:1337';
const SECRET = 'visionarc-secret-google-123';

export async function createRental(carId: string, pickupOffice: string, dropoffOffice: string, startDate: string, endDate: string) {
  const user = await getUser();
  if (!user) return { error: 'Önce giriş yapmalısınız.' };

  const res = await fetch(`${INTERNAL_API_URL}/api/rental-operations/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret: SECRET,
      userId: user.documentId,
      carId,
      pickupOffice,
      dropoffOffice,
      startDate,
      endDate
    })
  });

  const data = await res.json();
  if (!res.ok) return { error: data.details || 'Kiralama talebi oluşturulamadı.' };
  return { success: true };
}

export async function extendRental(rentalId: string, requestedEndDate: string) {
  const res = await fetch(`${INTERNAL_API_URL}/api/rental-operations/update-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret: SECRET,
      rentalId,
      rentalStatus: 'uzatma_talep',
      requestedEndDate
    })
  });
  if (!res.ok) return { error: 'Uzatma talebi iletilemedi.' };
  return { success: true };
}

export async function returnNoticeRental(rentalId: string) {
  const res = await fetch(`${INTERNAL_API_URL}/api/rental-operations/update-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret: SECRET,
      rentalId,
      rentalStatus: 'iade_bildirildi'
    })
  });
  if (!res.ok) return { error: 'Bildirim iletilemedi.' };
  return { success: true };
}

export async function getMyRentals(userId: string | number) {
  const res = await fetch(`${INTERNAL_API_URL}/api/rental-operations/my-rentals?secret=${SECRET}&userId=${userId}`, {
    cache: 'no-store'
  });
  if (!res.ok) return [];
  return await res.json();
}
