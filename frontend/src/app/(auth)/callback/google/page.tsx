'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setOauthSession } from '@/app/actions/auth';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      // Strapi redirects back with an 'access_token' or 'id_token' in the URL
      // if it handled the handshake, or directly with the 'jwt' if configured.
      const jwt = searchParams.get('access_token') || searchParams.get('id_token') || searchParams.get('access_token');
      
      // If Strapi already finished the flow and redirected here with the JWT:
      const strapiJwt = searchParams.get('jwt');

      if (strapiJwt) {
        await setOauthSession(strapiJwt);
        router.push('/rentacar');
        return;
      }

      // If we only have the access_token, we need to exchange it
      const accessToken = searchParams.get('access_token');
      if (accessToken) {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'}/api/auth/google/callback?access_token=${accessToken}`);
          const data = await res.json();
          if (data.jwt) {
            await setOauthSession(data.jwt);
            router.push('/rentacar');
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
        <p className="text-gray-500 text-sm">VisionArc Ekosistemine Güvenli Bağlantı Kuruluyor</p>
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
