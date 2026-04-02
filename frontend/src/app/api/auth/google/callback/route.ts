import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  // Strapi versiyonuna göre access_token veya id_token dönebilir
  const accessToken = url.searchParams.get('access_token') || url.searchParams.get('id_token');
  
  if (accessToken) {
    const cookieStore = await cookies();
    cookieStore.set('jwt', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 1 week
    });
  }

  // Google doğrulamasından başarıyla dönünce Ana ekrana veya Kiralama sayfasına at
  return NextResponse.redirect(new URL('/rentacar', req.url));
}
