'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getUser, getSession } from '@/lib/session';
import { revalidatePath } from 'next/cache';

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

  // Site kullanıcı JWT'si varsa kaydet
  if (data.jwt) {
    cookieStore.set('jwt', data.jwt, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 1 week
    });
  }

  // Admin JWT'si varsa (admin_users tablosundan eşleşme) kaydet
  if (data.adminJwt) {
    cookieStore.set('admin_token', data.adminJwt, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 1 day
    });
  } else {
    // Sadece standart bir kullanıcı giriş yaptıysa eski admin yetkisini sıfırla
    cookieStore.delete('admin_token');
  }

  redirect('/');
}

export async function registerUser(prevState: any, formData: FormData) {
  const firstName = String(formData.get('firstName') || '').trim();
  const lastName = String(formData.get('lastName') || '').trim();
  const email = String(formData.get('email') || '').trim();
  const password = formData.get('password');
  const phone = String(formData.get('phone') || '').trim();
  const acceptedTerms = formData.get('acceptedTerms') === 'on';

  // Strapi local auth requires a 'username' which has a strict unique constraint.
  // Çakışmaları önlemek için username olarak doğrudan benzersiz olan e-postayı kullanıyoruz.
  const username = email;

  if (!firstName || !lastName || !email || !password || !phone) return { error: 'Lütfen tüm alanları doldurun (Telefon dâhil).' };

  const res = await fetch(`${INTERNAL_API_URL}/api/auth/local/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password, phone, acceptedTerms }),
  });

  const data = await res.json();

  if (data?.error) {
    return { error: data.error.message || 'Kayıt olurken bir hata oluştu.' };
  }

  // --- MANUEL KAYIT AD SOYAD YAMASI ---
  try {
    await fetch(`${INTERNAL_API_URL}/api/user-extension/update-profile`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${data.jwt}`
      },
      body: JSON.stringify({
        username: username,
        firstName: firstName,
        lastName: lastName
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

  redirect('/');
}

export async function logoutUser() {
  const cookieStore = await cookies();
  cookieStore.delete('jwt');
  cookieStore.delete('admin_token');
  redirect('/');
}

export async function setOauthSession(jwt: string, adminJwt?: string) {
  const cookieStore = await cookies();
  cookieStore.set('jwt', jwt, {
    httpOnly: true,
    secure: false, // Localhost / Container testleri için false'a çekildi
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7
  });

  // Admin JWT varsa (admin rolündeki Google kullanıcıları)
  if (adminJwt) {
    cookieStore.set('admin_token', adminJwt, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24
    });
  } else {
    // Güvenlik: Eğer kullanıcı sadece 'user' ise ve önceden admin cookie'si kaldıysa temizle
    cookieStore.delete('admin_token');
  }
  
  return { success: true };
}

export async function linkGoogleAccount(accessToken: string) {
  const cookieStore = await cookies();
  const jwt = cookieStore.get('jwt')?.value;
  if (!jwt) return { error: 'Oturum bulunamadı. Lütfen giriş yapın.' };

  try {
    const res = await fetch(`${INTERNAL_API_URL}/api/user/link-google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ accessToken }),
    });

    const data = await res.json();
    if (!res.ok) return { error: data?.error?.message || 'Google hesabı bağlanamadı.' };
    return { success: true, googleEmail: data.googleEmail };
  } catch {
    return { error: 'Sunucuya bağlanılamadı.' };
  }
}

// Telefon Doğrulama Eylemi
export async function verifyPhone(phone: string) {
  const token = await getSession();
  if (!token) return { error: 'Oturum bulunamadı.' };

  const res = await fetch(`${INTERNAL_API_URL}/api/user-extension/verify-phone`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ phone })
  });

  const data = await res.json();
  if (!res.ok) {
    return { error: data.error?.message || 'Telefon numarası doğrulanamadı.' };
  }

  revalidatePath('/');
  revalidatePath('/rentacar');
  return { success: true };
}

export async function forgotPassword(prevState: any, formData: FormData) {
  const email = String(formData.get('email') || '').trim();
  if (!email) return { error: 'Lütfen e-posta adresinizi girin.' };

  try {
    const res = await fetch(`${INTERNAL_API_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (!res.ok) return { error: data?.error?.message || 'Bir hata oluştu.' };
    return { success: true };
  } catch {
    return { error: 'Sunucuya bağlanılamadı.' };
  }
}

export async function resetPassword(prevState: any, formData: FormData) {
  const token = String(formData.get('token') || '').trim();
  const password = String(formData.get('password') || '');
  const passwordConfirm = String(formData.get('passwordConfirm') || '');

  if (!token) return { error: 'Geçersiz istek.' };
  if (!password || !passwordConfirm) return { error: 'Lütfen tüm alanları doldurun.' };
  if (password !== passwordConfirm) return { error: 'Şifreler eşleşmiyor.' };
  if (password.length < 6) return { error: 'Şifre en az 6 karakter olmalıdır.' };

  try {
    const res = await fetch(`${INTERNAL_API_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password })
    });
    const data = await res.json();
    if (!res.ok) return { error: data?.error?.message || 'Bir hata oluştu.' };
    return { success: true };
  } catch {
    return { error: 'Sunucuya bağlanılamadı.' };
  }
}
