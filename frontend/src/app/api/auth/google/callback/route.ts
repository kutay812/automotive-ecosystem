














import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const googleAccessToken = url.searchParams.get('access_token');
  const error = url.searchParams.get('error');

  if (error || !googleAccessToken) {
    const errorMsg = error || 'Google yetkilendirme belirteci bulunamadı.';
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('errorMsg', errorMsg);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const internalApiUrl = process.env.INTERNAL_API_URL || 'http://backend:1337';
    const strapiRes = await fetch(
      `${internalApiUrl}/api/auth/google/callback?access_token=${encodeURIComponent(googleAccessToken)}`
    );

    if (!strapiRes.ok) {
      const errData = await strapiRes.json().catch(() => ({}));
      const errorMsg = errData?.error?.message || 'Google ile giriş başarısız oldu.';
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('errorMsg', errorMsg);
      return NextResponse.redirect(loginUrl);
    }

    const data = await strapiRes.json();
    const strapiJwt = data.jwt;
    const strapiUser = data.user;

    // Profil bilgilerini Google'dan tamamla (isteğe bağlı zenginleştirme)
    try {
      const googleInfoRes = await fetch(
        `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${encodeURIComponent(googleAccessToken)}`
      );
      if (googleInfoRes.ok) {
        const googleProfile = await googleInfoRes.json();
        const fallbackName = strapiUser.username || strapiUser.email.split('@')[0];
        const name = googleProfile.name || fallbackName;
        const firstName = googleProfile.given_name || name;
        const lastName = googleProfile.family_name || '-';

        await fetch(`${internalApiUrl}/api/user-extension/update-profile`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${strapiJwt}`
          },
          body: JSON.stringify({
            username: name,
            firstName: firstName,
            lastName: lastName
          })
        });
      }
    } catch (profileErr: any) {
      // Profil tamamlama hatası oturum açmayı engellememeli, sunucu tarafında logla
      console.warn('Google profil tamamlama uyarısı:', profileErr?.message || profileErr);
    }

    // JWT oturum çerezini kaydet
    const cookieStore = await cookies();
    cookieStore.set('jwt', strapiJwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 1 hafta
    });

    // Telefon numarası eksikse tamamlama sayfasına yönlendir
    if (!strapiUser?.phoneNumber && !data.user?.phoneNumber) {
      return NextResponse.redirect(new URL('/complete-phone', req.url));
    }

    return NextResponse.redirect(new URL('/rentacar', req.url));

  } catch (err: any) {
    console.error('Google OAuth callback hatası:', err?.message || err);
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('errorMsg', 'Giriş işlemi sırasında sunucu hatası oluştu.');
    return NextResponse.redirect(loginUrl);
  }
}
