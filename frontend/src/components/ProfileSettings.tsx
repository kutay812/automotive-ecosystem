'use client';

import { useState } from 'react';
import { linkGoogleAccount } from '@/app/actions/auth';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://127.0.0.1:1337';

export default function ProfileSettings({ user }: { user: any }) {
  const [linking, setLinking] = useState(false);
  const [linked, setLinked] = useState(!!user.googleId);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleGoogleLink = () => {
    setLinking(true);
    setError(null);

    // Google OAuth popup açar, callback URL ile token alır
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.innerWidth - width) / 2;
    const top = window.screenY + (window.innerHeight - height) / 2;

    const popup = window.open(
      `${STRAPI_URL}/api/connect/google`,
      'google-link',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    // Popup'tan access_token'ı bekle
    const interval = setInterval(async () => {
      try {
        if (!popup || popup.closed) {
          clearInterval(interval);
          setLinking(false);
          return;
        }

        // Popup URL'sini kontrol et
        const popupUrl = popup.location.href;
        if (popupUrl.includes('access_token=')) {
          clearInterval(interval);
          const url = new URL(popupUrl);
          const accessToken = url.searchParams.get('access_token');
          popup.close();

          if (accessToken) {
            const result = await linkGoogleAccount(accessToken);
            if (result.error) {
              setError(result.error);
            } else {
              setLinked(true);
              setSuccess(`Google hesabınız başarıyla bağlandı! (${result.googleEmail})`);
            }
          } else {
            setError('Google token alınamadı.');
          }
          setLinking(false);
        }
      } catch {
        // Cross-origin error — popup henüz farklı domain'de, normal
      }
    }, 500);
  };

  const handleGoogleUnlink = () => {
    // Şu an için sadece UI tarafında bilgilendirme
    setError('Google hesabı bağlantısını kaldırmak için yönetici ile iletişime geçin.');
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-[family-name:var(--font-outfit)] font-black text-white">Hesap Ayarları</h2>

      {/* Hesap Bilgileri */}
      <div className="glass-card rounded-2xl p-6 space-y-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        <h3 className="text-lg font-[family-name:var(--font-outfit)] font-bold text-white mb-4">Hesap Bilgileri</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1 font-medium">Ad Soyad</label>
            <p className="text-white font-medium">{user.firstName} {user.lastName}</p>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1 font-medium">E-posta</label>
            <p className="text-white font-medium">{user.email}</p>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1 font-medium">Kayıt Yöntemi</label>
            <span className={`inline-flex items-center gap-1.5 text-sm px-3 py-1 rounded-full border ${
              user.provider === 'google' 
                ? 'bg-blue-500/10 text-blue-400 border-blue-500/15' 
                : 'bg-white/[0.03] text-gray-400 border-white/8'
            }`}>
              {user.provider === 'google' ? '🔗 Google' : '📧 E-posta/Şifre'}
            </span>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1 font-medium">Kullanıcı Adı</label>
            <p className="text-gray-400 text-sm">@{user.username}</p>
          </div>
        </div>
      </div>

      {/* Google Hesap Bağlama */}
      <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-[family-name:var(--font-outfit)] font-bold text-white mb-1 flex items-center gap-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google Hesabı
            </h3>
            {linked ? (
              <p className="text-sm text-green-400">✅ Google hesabınız bağlı — Google ile giriş yapabilirsiniz.</p>
            ) : (
              <p className="text-sm text-gray-500">
                Google hesabınızı bağlayarak tek tıkla giriş yapabilirsiniz. Mevcut şifreniz de çalışmaya devam eder.
              </p>
            )}
          </div>

          <div className="flex-shrink-0">
            {linked ? (
              <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-500/10 text-green-400 border border-green-500/15 rounded-xl text-sm font-bold">
                ✓ Bağlı
              </span>
            ) : (
              <button
                onClick={handleGoogleLink}
                disabled={linking}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-black font-bold rounded-xl hover:bg-gray-100 transition-all duration-300 text-sm disabled:opacity-50 border shadow-lg"
              >
                {linking ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Bağlanıyor...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Google Hesabımı Bağla
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 text-red-400 text-sm p-3 bg-red-400/10 rounded-lg border border-red-400/20">{error}</div>
        )}
        {success && (
          <div className="mt-4 text-green-400 text-sm p-3 bg-green-400/10 rounded-lg border border-green-400/20">{success}</div>
        )}
      </div>
    </div>
  );
}
