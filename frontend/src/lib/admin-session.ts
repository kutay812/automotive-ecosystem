import { cookies } from 'next/headers';

export async function getAdminSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session')?.value;
  return session === 'authenticated' ? true : false;
}

export async function getAdminUser() {
  const isAuth = await getAdminSession();
  if (!isAuth) return null;

  // Admin bilgileri env'den veya sabitten
  return {
    firstname: process.env.ADMIN_NAME?.split(' ')[0] || 'Ali Kutay',
    lastname: process.env.ADMIN_NAME?.split(' ').slice(1).join(' ') || 'Tosun',
  };
}
