'use client';

import { useState, Suspense } from 'react';
import { resetPassword } from '@/app/actions/auth';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleAction = async (formData: FormData) => {
    if (!token) {
      setErrorMsg('Geçersiz istek. Token bulunamadı.');
      setStatus('error');
      return;
    }
    
    formData.append('token', token);
    setStatus('loading');
    setErrorMsg('');
    
    const res = await resetPassword(null, formData);
    if (res?.error) {
      setErrorMsg(res.error);
      setStatus('error');
    } else {
      setStatus('success');
    }
  };

  if (!token) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-[family-name:var(--font-outfit)] font-bold text-red-400 mb-4">Geçersiz Bağlantı</h1>
        <p className="text-gray-500 mb-6">Şifre sıfırlama bağlantısı geçersiz veya eksik.</p>
        <Link href="/login" className="text-primary hover:text-primary-light transition-colors duration-300">Giriş'e Dön</Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-3xl font-[family-name:var(--font-outfit)] font-black mb-2 text-white text-center">Yeni Şifre Belirle</h1>
      <p className="text-sm text-gray-500 mb-8 text-center text-balance">
        Lütfen hesabınız için yeni ve güvenli bir şifre belirleyin.
      </p>

      {status === 'success' ? (
        <div className="text-center">
          <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">✓</div>
          <p className="text-green-400 font-bold mb-6">Şifreniz başarıyla güncellendi!</p>
          <Link href="/login" className="inline-block btn-primary py-3 px-8 rounded-xl text-sm">
            Giriş Yap
          </Link>
        </div>
      ) : (
        <form action={handleAction} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Yeni Şifre</label>
            <input 
              name="password"
              type="password" 
              required
              placeholder="••••••••"
              minLength={6}
              className="w-full bg-white/[0.03] border border-white/8 rounded-xl px-4 py-3 text-white outline-none focus:border-primary/50 transition-all duration-300"
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Yeni Şifre (Tekrar)</label>
            <input 
              name="passwordConfirm"
              type="password" 
              required
              placeholder="••••••••"
              minLength={6}
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
            className="w-full btn-primary py-3.5 mt-4 rounded-xl text-sm disabled:opacity-50"
          >
            {status === 'loading' ? 'İşleniyor...' : 'Şifreyi Güncelle'}
          </button>
        </form>
      )}
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen pt-24 px-6 flex items-center justify-center relative w-full">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/15 blur-[180px] rounded-full pointer-events-none z-[-1]" />

      <div className="glass-card p-8 md:p-12 rounded-2xl w-full max-w-md relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <Suspense fallback={<div className="text-center text-gray-500">Yükleniyor...</div>}>
          <ResetPasswordContent />
        </Suspense>
      </div>
    </div>
  );
}
