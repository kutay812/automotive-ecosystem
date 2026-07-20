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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-surface-container-lowest border border-outline-variant rounded-xl p-8 z-10 shadow-[0_4px_40px_rgba(0,0,0,0.15)] flex flex-col max-h-[90vh] overflow-y-auto custom-scrollbar"
          >
            <button onClick={onClose} className="absolute top-4 right-4 text-on-surface-variant hover:text-primary transition-colors duration-300">
              <span className="material-symbols-outlined">close</span>
            </button>

            <h2 className="text-headline-md text-primary mb-2">İletişime Geçin</h2>
            <p className="text-body-md text-on-surface-variant mb-6">Projenizi hayata geçirmek için buradayız. Bilgilerinizi bırakın, sizi arayalım.</p>

            {status === 'success' ? (
              <div className="bg-green-50 text-green-700 p-5 rounded-lg border border-green-200 text-center">
                <span className="material-symbols-outlined text-[32px] mb-2">check_circle</span>
                <p>Mesajınız başarıyla alındı. En kısa sürede dönüş yapacağız!</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <input required
                    type="text" placeholder="Adınız Soyadınız"
                    className="w-full rounded-lg"
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div>
                  <input required
                    type="email" placeholder="E-posta Adresiniz"
                    className="w-full rounded-lg"
                    value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div>
                  <input
                    type="tel" placeholder="Telefon (İsteğe bağlı)"
                    className="w-full rounded-lg"
                    value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
                <div>
                  <textarea required rows={3} placeholder="Bize biraz projenizden bahsedin..."
                    className="w-full rounded-lg resize-none"
                    value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})}
                  ></textarea>
                </div>
                
                {status === 'error' && <span className="text-error text-caption">Bir hata oluştu, lütfen daha sonra tekrar deneyin.</span>}
                
                <button 
                  type="submit" 
                  disabled={status === 'loading'}
                  className="w-full btn-cta py-3.5 rounded-lg mt-2 disabled:opacity-50"
                >
                  {status === 'loading' ? 'Gönderiliyor...' : 'Mesajı Gönder'}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
