'use client';

import { useState } from 'react';
import { loginUser, registerUser } from '@/app/actions/auth';
import { motion, AnimatePresence } from 'framer-motion';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAction = async (formData: FormData) => {
    setLoading(true);
    setError(null);
    const result = isLogin ? await loginUser(null, formData) : await registerUser(null, formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  };

  const googleLogin = () => {
    window.location.href = `${STRAPI_URL}/api/connect/google`;
  };

  return (
    <div className="min-h-screen pt-24 px-6 flex items-center justify-center relative w-full">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/20 blur-[150px] rounded-full pointer-events-none z-[-1]" />

      <div className="glass p-8 md:p-12 rounded-3xl w-full max-w-md border border-white/5 shadow-2xl relative overflow-hidden">
        <h1 className="text-3xl font-black mb-2 text-white text-center">
          {isLogin ? 'Hoş Geldiniz' : 'Hesap Oluştur'}
        </h1>
        <p className="text-sm text-gray-400 mb-8 text-center text-balance">
          {isLogin ? 'Devam etmek için hesabınıza giriş yapın.' : 'Ekosisteme dâhil olun ve premium avantajlardan anında faydalanın.'}
        </p>

        {/* Tab Toggle */}
        <div className="flex bg-black/40 p-1 rounded-xl mb-8 relative">
          <div 
            className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white/10 border border-white/10 rounded-lg transition-all duration-300 pointer-events-none ${isLogin ? 'left-1' : 'left-[calc(50%)]'}`} 
          />
          <button 
            type="button"
            onClick={() => { setIsLogin(true); setError(null); }}
            className={`w-1/2 text-sm font-bold py-2.5 z-10 transition-colors ${isLogin ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Giriş Yap
          </button>
          <button 
            type="button"
            onClick={() => { setIsLogin(false); setError(null); }}
            className={`w-1/2 text-sm font-bold py-2.5 z-10 transition-colors ${!isLogin ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Kayıt Ol
          </button>
        </div>

        <form action={handleAction} className="flex flex-col gap-4">
          <AnimatePresence mode="popLayout">
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">Ad Soyad (Username)</label>
                <input 
                  name="name"
                  type="text" 
                  required={!isLogin}
                  placeholder="Adınız Soyadınız"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary transition-colors"
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">E-Posta</label>
            <input 
              name="email"
              type="email" 
              required
              placeholder="isim@visionarc.com"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">Şifre</label>
            <input 
              name="password"
              type="password" 
              required
              placeholder="••••••••"
              minLength={isLogin ? 1 : 6}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary transition-colors"
            />
          </div>

          {error && <div className="text-red-400 text-sm p-3 bg-red-400/10 rounded-md border border-red-400/20">{error}</div>}

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-black font-bold py-3 mt-4 rounded-xl hover:bg-primary/90 transition-colors shadow-[0_0_15px_rgba(255,90,0,0.3)] disabled:opacity-50"
          >
            {loading ? 'İşleniyor...' : isLogin ? 'Giriş Yap' : 'Hemen Kaydol'}
          </button>
        </form>

        <div className="my-6 flex items-center justify-center gap-4 text-gray-500 text-sm">
          <span className="w-1/3 h-[1px] bg-white/10"></span>
          <span>veya</span>
          <span className="w-1/3 h-[1px] bg-white/10"></span>
        </div>

        <button 
          onClick={googleLogin}
          type="button"
          className="flex items-center justify-center gap-3 w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-200 transition-all border shadow-lg"
        >
          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google ile Devam Et
        </button>
      </div>
    </div>
  );
}
