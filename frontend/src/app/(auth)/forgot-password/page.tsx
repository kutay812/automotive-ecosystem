'use client';

import { useState } from 'react';
import { forgotPassword } from '@/app/actions/auth';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleAction = async (formData: FormData) => {
    setStatus('loading');
    setErrorMsg('');
    const res = await forgotPassword(null, formData);
    if (res?.error) {
      setErrorMsg(res.error);
      setStatus('error');
    } else {
      setStatus('success');
    }
  };

  return (
    <div className="min-h-screen pt-24 px-6 flex items-center justify-center relative w-full">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/15 blur-[180px] rounded-full pointer-events-none z-[-1]" />

      <div className="glass-card p-8 md:p-12 rounded-2xl w-full max-w-md relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        
        <h1 className="text-3xl font-[family-name:var(--font-outfit)] font-black mb-2 text-white text-center">Şifremi Unuttum</h1>
        <p className="text-sm text-gray-500 mb-8 text-center text-balance">
          Hesabınıza kayıtlı e-posta adresini girin. Size şifre sıfırlama bağlantısı göndereceğiz.
        </p>

        {status === 'success' ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">📧</div>
            <p className="text-green-400 font-bold mb-6">Şifre sıfırlama linki gönderildi!</p>
            <p className="text-sm text-gray-500 mb-8">Lütfen e-posta kutunuzu (ve gerekiyorsa spam klasörünüzü) kontrol edin.</p>
            <Link href="/login" className="text-sm font-bold text-primary hover:text-primary-light transition-colors duration-300">
              Giriş Ekranına Dön
            </Link>
          </div>
        ) : (
          <form action={handleAction} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">E-Posta</label>
              <input 
                name="email"
                type="email" 
                required
                placeholder="isim@example.com"
                className="w-full bg-white/[0.03] border border-white/8 rounded-xl px-4 py-3 text-white outline-none focus:border-primary/50 transition-all duration-300"
              />
            </div>

            {status === 'error' && (
              <div className="text-red-400 text-sm p-3 bg-red-400/10 rounded-lg border border-red-400/20">
                {errorMsg}
              </div>
            )}

            <button 
              type="submit"
              disabled={status === 'loading'}
              className="w-full btn-primary py-3.5 mt-2 rounded-xl text-sm disabled:opacity-50"
            >
              {status === 'loading' ? 'Gönderiliyor...' : 'Bağlantı Gönder'}
            </button>
            
            <div className="text-center mt-4">
              <Link href="/login" className="text-xs text-gray-600 hover:text-white transition-colors duration-300">
                Giriş Ekranına Dön
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
