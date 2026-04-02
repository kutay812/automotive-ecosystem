'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { submitLead } from '@/lib/api';

export default function ContactModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '', source: 'website' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    const res = await submitLead(formData);
    if (res && res.data) {
      setStatus('success');
      setTimeout(() => {
        onClose();
        setStatus('idle');
        setFormData({ name: '', email: '', phone: '', message: '', source: 'website' });
      }, 3000);
    } else {
      setStatus('error');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md glass border border-white/10 rounded-2xl p-8 z-[101] shadow-2xl"
          >
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white pb-2 pl-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-2xl font-bold mb-2">İletişime Geçin</h2>
            <p className="text-sm text-gray-400 mb-6">Projenizi hayata geçirmek için buradayız. Bilgilerinizi bırakın, sizi arayalım.</p>

            {status === 'success' ? (
              <div className="bg-green-500/20 text-green-300 p-4 rounded-xl border border-green-500/30 text-center">
                Mesajınız başarıyla alındı. En kısa sürede dönüş yapacağız! 🚀
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <input required
                    type="text" placeholder="Adınız Soyadınız"
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 transition-colors"
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div>
                  <input required
                    type="email" placeholder="E-posta Adresiniz"
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 transition-colors"
                    value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div>
                  <input
                    type="tel" placeholder="Telefon (İsteğe bağlı)"
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 transition-colors"
                    value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
                <div>
                  <textarea required rows={3} placeholder="Bize biraz projenizden bahsedin..."
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 transition-colors resize-none"
                    value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})}
                  ></textarea>
                </div>
                
                {status === 'error' && <span className="text-red-400 text-sm">Bir hata oluştu, lütfen Strapi API izinlerini kontrol edin.</span>}
                
                <button 
                  type="submit" 
                  disabled={status === 'loading'}
                  className="w-full bg-primary text-black font-semibold py-3 rounded-lg hover:bg-primary/90 transition-colors mt-2"
                >
                  {status === 'loading' ? 'Gönderiliyor...' : 'Mesajı Gönder'}
                </button>
              </form>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
