'use client';

import { useState, Suspense, useEffect } from 'react';
import { loginUser, registerUser } from '@/app/actions/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import LegalModal from '@/components/LegalModal';
import { kvkkText, termsText } from '@/lib/legalTexts';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://127.0.0.1:1337';

function AuthContent() {
  const searchParams = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalType, setModalType] = useState<'kvkk' | 'terms' | null>(null);

  useEffect(() => {
    const errorMsg = searchParams.get('errorMsg');
    const strapiError = searchParams.get('error');
    if (errorMsg) {
      setError(decodeURIComponent(errorMsg));
    } else if (strapiError) {
      setError(`Giriş hatası: ${decodeURIComponent(strapiError)}`);
    }
  }, [searchParams]);

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
    const callbackURL = `${window.location.origin}/callback/google`;
    window.location.href = `${STRAPI_URL}/api/connect/google?callback=${callbackURL}&prompt=consent&access_type=offline`;
  };

  return (
    <div className="min-h-screen bg-surface-container flex items-center justify-center p-4 md:p-6 w-full">
      <div className="w-full max-w-[1100px] h-auto min-h-[700px] bg-surface rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.08)] flex flex-col lg:flex-row overflow-hidden border border-outline-variant relative z-10">
        
        {/* Sol Panel: Görsel ve Marka (Sadece Desktop) */}
        <div className="hidden lg:flex lg:w-5/12 bg-slate-900 relative items-center justify-center overflow-hidden p-12">
          {/* Arka Plan Desenleri */}
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] mix-blend-overlay"></div>
          <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] bg-secondary rounded-full blur-[100px] opacity-60"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-[#FF8C00] rounded-full blur-[100px] opacity-60"></div>
          
          <div className="relative z-10 text-white flex flex-col h-full justify-between">
            <div>
              <Link href="/" className="inline-flex items-center gap-2 mb-16 hover:opacity-80 transition-opacity">
                <div className="w-10 h-10 bg-white text-slate-900 rounded-xl flex items-center justify-center font-black text-xl shadow-lg">
                  E
                </div>
                <span className="text-2xl font-black tracking-tight">Example.</span>
              </Link>
            </div>
            
            <div className="space-y-6">
              <h2 className="text-display-md font-black leading-tight">
                Dijital <br/>
                <span className="text-blue-400">Ekosisteme</span> <br/>
                Katılın
              </h2>
              <p className="text-body-lg text-white/80 max-w-sm">
                Araç kiralama, e-ticaret ve medya hizmetlerini tek bir platformda deneyimleyin. Hızlı, güvenli ve kolay kullanım.
              </p>
            </div>
            
            <div className="mt-16 flex items-center gap-4">
              <div className="flex -space-x-3">
                <div className="w-10 h-10 rounded-full border-2 border-slate-900 bg-white/20 backdrop-blur-md flex items-center justify-center text-xs font-bold">JD</div>
                <div className="w-10 h-10 rounded-full border-2 border-slate-900 bg-white/20 backdrop-blur-md flex items-center justify-center text-xs font-bold">AS</div>
                <div className="w-10 h-10 rounded-full border-2 border-slate-900 bg-white/20 backdrop-blur-md flex items-center justify-center text-xs font-bold">MK</div>
              </div>
              <p className="text-caption text-white/80 font-medium">+1000 mutlu müşteri</p>
            </div>
          </div>
        </div>

        {/* Sağ Panel: Form */}
        <div className="w-full lg:w-7/12 p-8 md:p-12 lg:p-16 flex flex-col justify-center relative">
          <div className="lg:hidden mb-8 text-center">
            <div className="w-12 h-12 mx-auto bg-primary text-on-primary rounded-xl flex items-center justify-center font-black text-2xl shadow-lg mb-4">
              E
            </div>
            <h2 className="text-headline-sm font-black text-primary">Example.</h2>
          </div>

          <div className="max-w-md mx-auto w-full">
            <div className="text-center mb-8">
              <h1 className="text-display-sm font-black mb-2 text-primary">
                {isLogin ? 'Tekrar Hoş Geldiniz' : 'Hesap Oluşturun'}
              </h1>
              <p className="text-body-md text-on-surface-variant">
                {isLogin ? 'Devam etmek için giriş bilgilerinizi girin.' : 'Saniyeler içinde yeni bir hesap açın.'}
              </p>
            </div>

            {/* Tab Toggle */}
            <div className="flex bg-surface-container p-1 rounded-xl mb-8 relative border border-outline-variant shadow-inner">
              <div 
                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-surface border border-outline-variant rounded-lg shadow-sm transition-all duration-300 pointer-events-none ${isLogin ? 'left-1' : 'left-[calc(50%)]'}`} 
              />
              <button 
                type="button"
                onClick={() => { setIsLogin(true); setError(null); }}
                className={`w-1/2 text-label-md py-2.5 z-10 transition-colors duration-300 ${isLogin ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                Giriş Yap
              </button>
              <button 
                type="button"
                onClick={() => { setIsLogin(false); setError(null); }}
                className={`w-1/2 text-label-md py-2.5 z-10 transition-colors duration-300 ${!isLogin ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                Kayıt Ol
              </button>
            </div>

            <form action={handleAction} className="flex flex-col gap-5">
              <AnimatePresence mode="popLayout">
                {!isLogin && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: -10 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex gap-4">
                      <div className="w-1/2">
                        <label className="block text-caption text-on-surface-variant mb-1.5 font-semibold">Adınız</label>
                        <div className="flex items-center bg-surface border border-outline-variant rounded-xl focus-within:border-secondary focus-within:ring-1 focus-within:ring-secondary transition-all overflow-hidden">
                          <input 
                            name="firstName"
                            type="text" 
                            required={!isLogin}
                            placeholder="Adınız"
                            className="w-full bg-transparent px-4 py-3 text-on-surface outline-none"
                          />
                        </div>
                      </div>
                      <div className="w-1/2">
                        <label className="block text-caption text-on-surface-variant mb-1.5 font-semibold">Soyadınız</label>
                        <div className="flex items-center bg-surface border border-outline-variant rounded-xl focus-within:border-secondary focus-within:ring-1 focus-within:ring-secondary transition-all overflow-hidden">
                          <input 
                            name="lastName"
                            type="text" 
                            required={!isLogin}
                            placeholder="Soyadınız"
                            className="w-full bg-transparent px-4 py-3 text-on-surface outline-none"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="mt-5">
                      <label className="block text-caption text-on-surface-variant mb-1.5 font-semibold">Telefon Numaranız</label>
                      <div className="flex items-center bg-surface border border-outline-variant rounded-xl focus-within:border-secondary focus-within:ring-1 focus-within:ring-secondary transition-all overflow-hidden">
                        <input 
                          name="phone"
                          type="tel" 
                          required={!isLogin}
                          placeholder="05XX XXX XX XX"
                          className="w-full bg-transparent px-4 py-3 text-on-surface outline-none"
                        />
                      </div>
                      <p className="text-[11px] text-outline mt-1.5 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">info</span>
                        Araç kiralama için doğrulama gereklidir.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div>
                <label className="block text-caption text-on-surface-variant mb-1.5 font-semibold">E-Posta Adresiniz</label>
                <div className="relative flex items-center bg-surface border border-outline-variant rounded-xl focus-within:border-secondary focus-within:ring-1 focus-within:ring-secondary transition-all overflow-hidden">
                  <span className="pl-4 pr-2 material-symbols-outlined text-outline">mail</span>
                  <input 
                    name="email"
                    type="email" 
                    required
                    placeholder="isim@example.com"
                    className="w-full bg-transparent py-3 pr-4 text-on-surface outline-none"
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-caption text-on-surface-variant font-semibold">Şifreniz</label>
                  {isLogin && (
                    <Link href="/forgot-password" className="text-caption font-semibold text-secondary hover:text-secondary-container transition-colors">
                      Şifremi Unuttum
                    </Link>
                  )}
                </div>
                <div className="relative flex items-center bg-surface border border-outline-variant rounded-xl focus-within:border-secondary focus-within:ring-1 focus-within:ring-secondary transition-all overflow-hidden">
                  <span className="pl-4 pr-2 material-symbols-outlined text-outline">lock</span>
                  <input 
                    name="password"
                    type="password" 
                    required
                    placeholder="••••••••"
                    minLength={isLogin ? 1 : 6}
                    className="w-full bg-transparent py-3 pr-4 text-on-surface outline-none"
                  />
                </div>
              </div>

              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="flex flex-col gap-3 mt-1"
                >
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative flex items-start mt-0.5">
                      <input type="checkbox" name="acceptedTerms" required className="peer w-5 h-5 rounded border-outline-variant text-secondary focus:ring-secondary cursor-pointer" />
                    </div>
                    <span className="text-caption text-on-surface-variant leading-relaxed">
                      <a href="#" className="text-secondary hover:underline font-medium" onClick={(e) => { e.preventDefault(); setModalType('kvkk'); }}>KVKK Aydınlatma Metnini</a> ve <a href="#" className="text-secondary hover:underline font-medium" onClick={(e) => { e.preventDefault(); setModalType('terms'); }}>Kullanıcı Sözleşmesini</a> okudum ve kabul ediyorum.
                    </span>
                  </label>
                </motion.div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-on-error-container text-caption font-medium p-3 bg-error-container rounded-xl border border-error/20">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  {error}
                </div>
              )}

              <button 
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-4 mt-2 rounded-xl text-label-lg shadow-lg shadow-primary/20 hover:shadow-primary/30 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                    İşleniyor...
                  </>
                ) : isLogin ? 'Giriş Yap' : 'Hesap Oluştur'}
              </button>
            </form>

            <div className="my-8 flex items-center justify-center gap-4 text-outline text-caption font-medium">
              <span className="flex-1 h-px bg-outline-variant"></span>
              <span>veya</span>
              <span className="flex-1 h-px bg-outline-variant"></span>
            </div>

            <button 
              onClick={googleLogin}
              type="button"
              className="flex items-center justify-center gap-3 w-full bg-surface text-on-surface font-bold py-3.5 rounded-xl hover:bg-surface-container transition-all duration-300 border border-outline-variant shadow-sm hover:shadow-md"
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
      </div>

      <LegalModal 
        isOpen={modalType !== null}
        onClose={() => setModalType(null)}
        title={modalType === 'kvkk' ? 'KVKK Aydınlatma Metni' : 'Kullanıcı Sözleşmesi'}
        content={modalType === 'kvkk' ? kvkkText : termsText}
      />
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-surface-container text-on-surface-variant">
        <span className="material-symbols-outlined animate-spin text-[40px]">progress_activity</span>
      </div>
    }>
      <AuthContent />
    </Suspense>
  );
}
