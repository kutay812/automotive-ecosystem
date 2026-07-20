'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { submitTestPayment } from '@/app/actions/rental';

export default function PaymentTestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rentalId = searchParams.get('rentalId');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handlePayment = async () => {
    setLoading(true);
    // 1 saniye bekle (Ödeme işleniyor simülasyonu)
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      if (!rentalId) {
        alert('Geçersiz kiralama ID.');
        setLoading(false);
        return;
      }
      const txId = 'TEST_TXN_' + Math.random().toString(36).substring(2, 10).toUpperCase();
      const res = await submitTestPayment(rentalId, txId);

      if (res.success) {
        setSuccess(true);
        // Başarılı ödeme sonrası 2 saniye bekleyip profile yönlendir
        setTimeout(() => {
          router.push('/profile');
        }, 2000);
      } else {
        alert(res.error || 'Ödeme doğrulanamadı.');
        setLoading(false);
      }
    } catch (e) {
      alert('Sistem hatası.');
      setLoading(false);
    }
  };

  if (!rentalId) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center">
        <div className="text-gray-500">Geçersiz ödeme oturumu.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white flex items-center justify-center p-4 pt-20">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/10 blur-[180px] rounded-full pointer-events-none z-0" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full glass-card rounded-2xl p-8 relative overflow-hidden z-10"
      >
        {/* Top accent gradient */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary-light to-primary"></div>
        
        {success ? (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
              ✓
            </div>
            <h2 className="text-2xl font-[family-name:var(--font-outfit)] font-black mb-2">Test Ödeme Başarılı</h2>
            <p className="text-gray-500 mb-6">Ödeme entegrasyonu geliştirme aşamasındadır. Şimdilik bu adımı başarıyla geçtiniz.</p>
            <p className="text-sm text-gray-600 animate-pulse">Profilinize yönlendiriliyorsunuz...</p>
          </div>
        ) : (
          <div>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-[family-name:var(--font-outfit)] font-black mb-2">Güvenli Ödeme</h2>
              <p className="text-gray-500 text-sm">Geliştirme Ortamı Test Sayfası</p>
            </div>

            <div className="bg-white/[0.03] border border-white/8 rounded-xl p-4 mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">Rezervasyon ID</span>
                <span className="font-mono text-gray-300">{rentalId}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t border-white/5 pt-2 mt-2">
                <span>Ödenecek Tutar</span>
                <span className="text-primary">TEST</span>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5 ml-1 font-medium">Kart Numarası</label>
                <input type="text" disabled placeholder="**** **** **** ****" className="w-full bg-white/[0.02] border border-white/8 rounded-xl px-4 py-3 text-white opacity-40 cursor-not-allowed" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5 ml-1 font-medium">SKT</label>
                  <input type="text" disabled placeholder="AA/YY" className="w-full bg-white/[0.02] border border-white/8 rounded-xl px-4 py-3 text-white opacity-40 cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5 ml-1 font-medium">CVV</label>
                  <input type="text" disabled placeholder="***" className="w-full bg-white/[0.02] border border-white/8 rounded-xl px-4 py-3 text-white opacity-40 cursor-not-allowed" />
                </div>
              </div>
            </div>

            <button
              onClick={handlePayment}
              disabled={loading}
              className="w-full py-4 btn-primary rounded-xl disabled:opacity-50 disabled:cursor-wait text-base"
            >
              {loading ? 'İşleniyor...' : 'Test Ödemesini Tamamla'}
            </button>
            <p className="text-center text-xs text-gray-600 mt-4">
              Bu sayfa test amaçlıdır, gerçek bir ödeme çekilmeyecektir. Gelecekte Stripe veya iyzico ile değiştirilecektir.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
