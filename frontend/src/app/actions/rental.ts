'use server';

import crypto from 'crypto';
import { getUser, getSession } from '@/lib/session';

const INTERNAL_API_URL = process.env.INTERNAL_API_URL || 'http://backend:1337';

export async function createRental(carId: string, pickupOffice: string, dropoffOffice: string, startDate: string, endDate: string, paymentMethod: string = 'office') {
  const token = await getSession();
  if (!token) return { error: 'Önce giriş yapmalısınız.' };

  const res = await fetch(`${INTERNAL_API_URL}/api/rental-operations/create`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      carId,
      pickupOffice,
      dropoffOffice,
      startDate,
      endDate,
      paymentMethod
    })
  });

  const data = await res.json();
  if (!res.ok) {
    return { error: data?.error?.message || data?.details || 'Kiralama talebi oluşturulamadı.' };
  }
  return { success: true, rentalId: data.documentId };
}

export async function extendRental(rentalId: string, requestedEndDate: string) {
  const token = await getSession();
  const res = await fetch(`${INTERNAL_API_URL}/api/rental-operations/update-status`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      rentalId,
      rentalStatus: 'uzatma_talep',
      requestedEndDate
    })
  });
  if (!res.ok) return { error: 'Uzatma talebi iletilemedi.' };
  return { success: true };
}

export async function returnNoticeRental(rentalId: string, earlyReturnDate?: string, rentalStatus = 'iade_bildirildi') {
  const token = await getSession();
  const body: any = {
    rentalId,
    rentalStatus,
  };
  if (earlyReturnDate) body.requestedEndDate = earlyReturnDate;

  const res = await fetch(`${INTERNAL_API_URL}/api/rental-operations/update-status`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: data?.error?.message || 'Bildirim iletilemedi.' };
  }
  return { success: true };
}

export async function getMyRentals(userId: string | number) {
  const token = await getSession();
  const res = await fetch(`${INTERNAL_API_URL}/api/rental-operations/my-rentals`, {
    headers: {
      'Authorization': `Bearer ${token}`
    },
    cache: 'no-store'
  });
  if (!res.ok) return [];
  return await res.json();
}

export async function submitTestPayment(rentalId: string, transactionId: string) {
  const payload = JSON.stringify({ rentalId, transactionId });
  const signature = crypto.createHmac('sha256', process.env.PAYMENT_WEBHOOK_SECRET || 'example-payment-secret-2026')
                          .update(payload).digest('hex');

  const res = await fetch(`${INTERNAL_API_URL}/api/rental-operations/payment/success`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-payment-signature': signature 
    },
    body: payload
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    return { error: errorData.error?.message || 'Ödeme doğrulanamadı.' };
  }
  return { success: true };
}
