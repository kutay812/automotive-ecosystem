import { cookies } from 'next/headers';
import { fetchAPI } from './api';

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('jwt')?.value;
  return token || null;
}

export async function getUser() {
  const token = await getSession();
  if (!token) return null;

  try {
    const user = await fetchAPI('/api/users/me', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (user?.error) return null;
    return user || null;
  } catch {
    return null;
  }
}
