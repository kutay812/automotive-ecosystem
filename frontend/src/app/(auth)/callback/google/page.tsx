'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setOauthSession } from '@/app/actions/auth';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      // Popup modda mı açıldık? (Google hesap bağlama)
      const isPopup = window.opener !== null;

      // If Strapi already finished the flow and redirected here with the JWT:
      const strapiJwt = searchParams.get('jwt');
      if (strapiJwt) {
        if (isPopup) {
          // Popup modda — ana pencere token'ı URL'den okuyacak, sadece bekle
          return;
        }
        await setOauthSession(strapiJwt);
        router.push('/');
        return;
      }

      // If we only have the access_token, we need to exchange it
      const accessToken = searchParams.get('access_token');
      if (accessToken) {
        if (isPopup) {
          // Popup modda — ana pencere access_token'ı URL'den okuyacak
          // Sayfayı açık bırak, ProfileSettings interval ile kontrol edecek
          return;
        }

        // Normal giriş akışı — token'ı exchange et
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'}/api/auth/google/callback?access_token=${accessToken}`);
          const data = await res.json();
          if (data.jwt) {
            // Admin JWT varsa onu da kaydet (rol koruması)
            await setOauthSession(data.jwt, data.adminJwt || undefined);
            
            if (!data.user?.phoneNumber) {
              router.push('/complete-phone');
            } else {
              router.push('/');
            }
          } else {
            router.push('/login?errorMsg=Giriş yapılamadı.');
          }
        } catch (err) {
          router.push('/login?errorMsg=Bağlantı hatası.');
        }
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xl font-bold tracking-widest text-primary animate-pulse">Giriş Yapılıyor...</p>
        <p className="text-gray-500 text-sm">Hesabınıza güvenli bağlantı kuruluyor</p>
      </div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={null}>
      <CallbackContent />
    </Suspense>
  );
}
