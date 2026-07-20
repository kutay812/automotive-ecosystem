import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  // Strapi versiyonuna göre access_token veya id_token dönebilir
  const googleAccessToken = url.searchParams.get('access_token');
  const error = url.searchParams.get('error');

  if (error || !googleAccessToken) {
    const errorMsg = error || 'Google Access Token bulunamadi.';
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('errorMsg', errorMsg);
    return NextResponse.redirect(loginUrl);
  }

  try {
    // 1. Google'dan gelen raw token'i Strapi'ye gönderip gerçek Strapi kullanıcısını oluştur/getir
    const internalApiUrl = process.env.INTERNAL_API_URL || 'http://backend:1337';
    const strapiRes = await fetch(`${internalApiUrl}/api/auth/google/callback?access_token=${googleAccessToken}`);
    
    if (!strapiRes.ok) {
      const errData = await strapiRes.json();
      const errorMsg = errData?.error?.message || 'Strapi Google Auth basarisiz oldu.';
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('errorMsg', errorMsg);
      return NextResponse.redirect(loginUrl);
    }

    const data = await strapiRes.json();
    const strapiJwt = data.jwt; 
    const strapiUser = data.user;

    // --- GOOGLE AD SOYAD GÜNCELLEME YAMASI ---
    try {
      // 1. Google'dan doğrudan profil verisini çekiyoruz
      const googleInfoRes = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${googleAccessToken}`);
      if (googleInfoRes.ok) {
        const googleProfile = await googleInfoRes.json();
        
        // 2. Google'dan verileri al (name, given_name, family_name)
        // Eğer Google kullanıcınıza 'profile' izni verilmemişse bu değerler "undefined" gelir.
        const fallbackName = strapiUser.username || strapiUser.email.split('@')[0];
        
        const name = googleProfile.name || fallbackName;
        const firstName = googleProfile.given_name || name;
        // lastName boş gelirse Strapi 'minLength: 1' hatasına düşmesin diye fallback '-'
        const lastName = googleProfile.family_name || '-';

        // 3. Özel hazırlanan Backend rotasına (Kullanıcı yetkisi gerektirmeden) POST atarak güncelliyoruz
        const updateRes = await fetch(`${internalApiUrl}/api/user-extension/update-profile`, {
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

        if (!updateRes.ok) {
          const errText = await updateRes.text();
          return NextResponse.json({ error: "BACKEND_UPDATE_FIRED_BUT_FAILED", details: errText });
        }
      }
    } catch (e: any) {
      return NextResponse.json({ error: "GOOGLE_FETCH_OR_TRY_CATCH_FAILED", message: e.message, stack: e.stack });
    }
    // --- YAMA SONU ---

    // 2. Strapi JWT'yi cookie'ye kaydet
    const cookieStore = await cookies();
    cookieStore.set('jwt', strapiJwt, {
      httpOnly: true,
      secure: false, // Localhost / Container testleri için false
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 1 week
    });

    // 3. Telefon numarası kontrolü (Eğer yoksa tamamlama sayfasına)
    if (!strapiUser.phoneNumber && !data.user.phoneNumber) {
       return NextResponse.redirect(new URL('/complete-phone', req.url));
    }
    
    return NextResponse.redirect(new URL('/rentacar', req.url));

  } catch (err: any) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('errorMsg', 'Network/Backend Hatasi: ' + err.message);
    return NextResponse.redirect(loginUrl);
  }
}
