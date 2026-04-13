'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const INTERNAL_API_URL = process.env.INTERNAL_API_URL || 'http://backend:1337';

export async function loginUser(prevState: any, formData: FormData) {
  const email = formData.get('email');
  const password = formData.get('password');

  if (!email || !password) return { error: 'Lütfen tüm alanları doldurun.' };

  const res = await fetch(`${INTERNAL_API_URL}/api/auth/local`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: email, password }),
  });

  const data = await res.json();

  if (data?.error) {
    return { error: 'E-posta veya şifre hatalı.' };
  }

  const cookieStore = await cookies();
  cookieStore.set('jwt', data.jwt, {
    httpOnly: true,
    secure: false, // Localhost / Container testleri için false'a çekildi
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7 // 1 week
  });

  redirect('/rentacar');
}

export async function registerUser(prevState: any, formData: FormData) {
  const firstName = String(formData.get('firstName') || '').trim();
  const lastName = String(formData.get('lastName') || '').trim();
  const email = String(formData.get('email') || '').trim();
  const password = formData.get('password');

  // Strapi local auth requires a 'username' which has a strict unique constraint.
  // Çakışmaları önlemek için username olarak doğrudan benzersiz olan e-postayı kullanıyoruz.
  const username = email;

  if (!firstName || !lastName || !email || !password) return { error: 'Lütfen tüm alanları doldurun.' };

  const res = await fetch(`${INTERNAL_API_URL}/api/auth/local/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });

  const data = await res.json();

  if (data?.error) {
    return { error: data.error.message || 'Kayıt olurken bir hata oluştu.' };
  }

  // --- MANUEL KAYIT AD SOYAD YAMASI ---
  try {
    await fetch(`${INTERNAL_API_URL}/api/user-extension/update-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: data.user.id,
        username: username,
        firstName: firstName,
        lastName: lastName,
        secret: 'visionarc-secret-google-123'
      })
    });
  } catch (e) {
    console.error("Manuel kayit ad soyad guncellenemedi", e);
  }
  // --- YAMA SONU ---

  const cookieStore = await cookies();
  cookieStore.set('jwt', data.jwt, {
    httpOnly: true,
    secure: false, // Localhost / Container testleri için false'a çekildi
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7
  });

  redirect('/rentacar');
}

export async function logoutUser() {
  const cookieStore = await cookies();
  cookieStore.delete('jwt');
  redirect('/');
}

export async function setOauthSession(jwt: string) {
  const cookieStore = await cookies();
  cookieStore.set('jwt', jwt, {
    httpOnly: true,
    secure: false, // Localhost / Container testleri için false'a çekildi
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7
  });
  
  return { success: true };
}
