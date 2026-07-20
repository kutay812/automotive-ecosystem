'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { verifyPhone } from '@/app/actions/auth';
import { motion } from 'framer-motion';

export default function CompletePhonePage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      setError('Lütfen geçerli bir telefon numarası girin.');
      return;
    }

    setLoading(true);
    setError(null);
    const result = await verifyPhone(phone);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen pt-24 px-6 flex items-center justify-center relative w-full">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/15 blur-[180px] rounded-full pointer-events-none z-[-1]" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card p-8 md:p-12 rounded-2xl w-full max-w-md relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        
        <h1 className="text-3xl font-[family-name:var(--font-outfit)] font-black mb-2 text-white text-center">Doğrulama Gerekli</h1>
        <p className="text-sm text-gray-500 mb-8 text-center text-balance">
          Araç kiralama işlemlerine devam edebilmek için lütfen telefon numaranızı ekleyin.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Telefon Numarası</label>
            <input 
              type="tel" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              placeholder="05XX XXX XX XX"
              className="w-full bg-white/[0.03] border border-white/8 rounded-xl px-4 py-3 text-white outline-none focus:border-primary/50 transition-all duration-300"
            />
          </div>

          {error && <div className="text-red-400 text-sm p-3 bg-red-400/10 rounded-lg border border-red-400/20">{error}</div>}

          <button 
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-3.5 mt-4 rounded-xl text-sm disabled:opacity-50"
          >
            {loading ? 'Kaydediliyor...' : 'Telefonumu Doğrula'}
          </button>
        </form>
        <p className="text-center text-[10px] text-gray-600 mt-6">
          Bu işlem size gelecekte yapılacak rezervasyon bilgilendirmeleri için gereklidir. Girdiğiniz numara sadece gerekli iletişim amacıyla kullanılır.
        </p>
      </motion.div>
    </div>
  );
}
