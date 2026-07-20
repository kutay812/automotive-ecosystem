'use client';

import { useState } from 'react';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://127.0.0.1:1337';

export default function SupportSection() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch(`${STRAPI_URL}/api/support`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setStatus('success');
        setForm({ name: '', email: '', subject: '', message: '' });
        setTimeout(() => setStatus('idle'), 5000);
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data?.error?.message || 'Bir hata oluştu.');
        setStatus('error');
      }
    } catch {
      setErrorMsg('Sunucuya bağlanılamadı.');
      setStatus('error');
    }
  };

  return (
    <section className="w-full bg-surface py-16">
      <div className="max-w-[1280px] mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Info */}
          <div>
            <h2 className="text-headline-md text-primary mb-3">
              Size Nasıl <span className="text-secondary">Yardımcı</span> Olabiliriz?
            </h2>
            <p className="text-body-md text-on-surface-variant mb-8">
              Herhangi bir sorunuz, öneriniz veya şikayetiniz mi var? Destek ekibimiz size en kısa sürede dönüş yapacaktır.
            </p>
            <div className="space-y-4">
              {[
                { icon: 'bolt', title: 'Hızlı Yanıt', desc: 'Talepleriniz en kısa sürede değerlendirilir' },
                { icon: 'shield', title: 'Güvenli İletişim', desc: 'Bilgileriniz gizli tutulur' },
                { icon: 'monitoring', title: 'Takip Edilebilir', desc: 'Talebinizin durumunu yönetici ekibimiz takip eder' },
              ].map(item => (
                <div key={item.title} className="flex items-start gap-4 group">
                  <div className="w-10 h-10 rounded-lg bg-surface-container border border-outline-variant flex items-center justify-center group-hover:bg-secondary/10 group-hover:border-secondary/20 transition-all duration-300 flex-shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-secondary text-[20px]">{item.icon}</span>
                  </div>
                  <div>
                    <h4 className="text-label-md text-primary mb-0.5">{item.title}</h4>
                    <p className="text-caption text-on-surface-variant">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Form */}
          <div className="card rounded-xl p-8 relative">
            {status === 'success' ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-green-50 border border-green-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-green-600 text-[32px]">check_circle</span>
                </div>
                <h3 className="text-headline-sm text-primary mb-2">Talebiniz Alındı!</h3>
                <p className="text-body-md text-on-surface-variant">En kısa sürede size dönüş yapacağız.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="text-headline-sm text-primary mb-1">Destek Talebi Oluştur</h3>
                <p className="text-caption text-on-surface-variant mb-5">Tüm alanları doldurmanız gerekmektedir.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-caption text-on-surface-variant mb-1.5 font-medium">Adınız Soyadınız *</label>
                    <input
                      required type="text" placeholder="Adınız Soyadınız"
                      value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                      className="w-full rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-caption text-on-surface-variant mb-1.5 font-medium">E-posta *</label>
                    <input
                      required type="email" placeholder="ornek@email.com"
                      value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                      className="w-full rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-caption text-on-surface-variant mb-1.5 font-medium">Konu *</label>
                  <input
                    required type="text" placeholder="Talebinizin konusu"
                    value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}
                    className="w-full rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-caption text-on-surface-variant mb-1.5 font-medium">Mesajınız *</label>
                  <textarea
                    required rows={4} placeholder="Detaylı açıklama yazınız..."
                    value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
                    className="w-full rounded-lg resize-none"
                  />
                </div>

                {status === 'error' && (
                  <div className="text-on-error-container text-caption p-3 bg-error-container rounded-lg border border-error/20">
                    {errorMsg || 'Bir hata oluştu.'}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full btn-cta py-3.5 rounded-lg disabled:opacity-50"
                >
                  {status === 'loading' ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Gönderiliyor...
                    </span>
                  ) : (
                    'Talebi Gönder'
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
