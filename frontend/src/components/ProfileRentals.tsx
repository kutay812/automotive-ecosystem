'use client';

import { useState } from 'react';
import { extendRental, returnNoticeRental } from '@/app/actions/rental';
import { useRouter } from 'next/navigation';

function toDateStr(d: string | Date) {
  return new Date(d).toISOString().split('T')[0];
}

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}

export default function ProfileRentals({ rentals }: { rentals: any[] }) {
  const router = useRouter();

  const [extendingId, setExtendingId] = useState<string | null>(null);
  const [extendDate, setExtendDate] = useState('');

  const [earlyReturnId, setEarlyReturnId] = useState<string | null>(null);
  const [earlyReturnDate, setEarlyReturnDate] = useState('');

  // Turkey UTC+3
  const todayDate = new Date();
  todayDate.setHours(todayDate.getHours() + 3);
  const todayStr = todayDate.toISOString().split('T')[0];

  // Extension: new end date must be strictly AFTER current end date
  const handleExtend = async (rentalId: string, currentEndDate: string) => {
    if (!extendDate) {
      alert('Lütfen uzatmak istediğiniz tarihi seçin.');
      return;
    }
    const minRequired = addDays(currentEndDate, 1);
    if (extendDate <= currentEndDate) {
      alert(`Uzatma tarihi, mevcut teslim tarihinden (${new Date(currentEndDate).toLocaleDateString('tr-TR')}) daha ileri bir tarih olmalıdır.`);
      return;
    }
    const res = await extendRental(rentalId, extendDate);
    if (res.error) alert(res.error);
    else {
      alert('Uzatma talebiniz yöneticiye iletildi.');
      setExtendingId(null);
      setExtendDate('');
      router.refresh();
    }
  };

  // Early return: sends erken_teslim_talep (requires admin approval)
  const handleEarlyReturn = async (rentalId: string, startDate: string) => {
    if (!earlyReturnDate) {
      alert('Lütfen erken teslim tarihini seçin.');
      return;
    }
    const minRequired = addDays(startDate, 1);
    if (earlyReturnDate <= startDate) {
      alert(`Erken teslim tarihi, alış tarihiyle aynı gün olamaz. Minimum 1 gün kiralama zorunludur (en erken: ${new Date(minRequired).toLocaleDateString('tr-TR')}).`);
      return;
    }
    // Send as erken_teslim_talep — requires admin approval before finalizing
    const res = await returnNoticeRental(rentalId, earlyReturnDate, 'erken_teslim_talep');
    if (res.error) alert(res.error);
    else {
      alert('Erken teslim talebiniz yöneticiye iletildi. Onaylandiktan sonra işleminiz tamamlanacaktır.');
      setEarlyReturnId(null);
      setEarlyReturnDate('');
      router.refresh();
    }
  };

  // Standard return (next-day notice, no specific date)
  const handleReturn = async (rentalId: string) => {
    if (confirm('Aracı yakın zamanda teslim edeceğinizi bildirmek istediğinize emin misiniz?')) {
      const res = await returnNoticeRental(rentalId, undefined);
      if (res.error) alert(res.error);
      else {
        alert('İade bildiriminiz kaydedildi. Ofisimizde aracı teslim edebilirsiniz.');
        router.refresh();
      }
    }
  };

  const pendingRentals = rentals.filter(r => r.rentalStatus === 'bekliyor');
  const activeRentals = rentals.filter(r => ['aktif', 'uzatma_talep', 'iade_bildirildi', 'erken_teslim_talep'].includes(r.rentalStatus));
  const pastRentals = rentals.filter(r => r.rentalStatus === 'bitti' || r.rentalStatus === 'iptal');

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      bekliyor:             { label: 'Onay Bekliyor',              cls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20' },
      aktif:                { label: 'Aktif (Kullanımda)',          cls: 'bg-green-500/15 text-green-400 border-green-500/20' },
      uzatma_talep:         { label: 'Uzatma Onayı Bekleniyor',   cls: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
      erken_teslim_talep:   { label: 'Erken Teslim Talebi ⏳',     cls: 'bg-purple-500/15 text-purple-400 border-purple-500/20' },
      iade_bildirildi:      { label: 'İade Bildirimi Yapıldı',   cls: 'bg-orange-500/15 text-orange-400 border-orange-500/20' },
      bitti:                { label: 'Tamamlandı',               cls: 'bg-gray-500/15 text-gray-400 border-gray-500/20' },
      iptal:                { label: 'İptal Edildi',              cls: 'bg-red-500/15 text-red-400 border-red-500/20' },
    };
    const cfg = map[status] || { label: status, cls: 'bg-white/10 text-gray-300 border-white/20' };
    return <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${cfg.cls}`}>{cfg.label}</span>;
  };

  return (
    <div className="space-y-12">

      {/* Aktif Kiralamalar */}
      <section>
        <h2 className="text-2xl font-[family-name:var(--font-outfit)] font-bold mb-6 text-green-400 flex items-center gap-2">
          <span>🟢</span> Aktif Kiralamalarım
        </h2>
        {activeRentals.length === 0 ? (
          <p className="text-gray-600 italic px-4 text-sm">Aktif kiraladığınız bir araç bulunmuyor.</p>
        ) : (
          <div className="grid gap-6">
            {activeRentals.map(rental => {
              const currentEnd = toDateStr(rental.endDate);
              const startD = toDateStr(rental.startDate);
              const minExtend = addDays(currentEnd, 1);
              const minEarlyReturn = addDays(startD, 1);

              return (
                <div key={rental.documentId} className="glass-card p-6 rounded-2xl border-green-500/10 flex flex-col md:flex-row justify-between gap-6">
                  <div>
                    <h3 className="text-xl font-[family-name:var(--font-outfit)] font-bold text-white">{rental.car?.brand} {rental.car?.model}</h3>
                    <p className="text-gray-500 mt-1 text-sm">
                      📍 {rental.pickupOffice} ➔ {rental.dropoffOffice}
                    </p>
                    <p className="text-gray-400 mt-1 font-mono text-sm">
                      {new Date(rental.startDate).toLocaleDateString('tr-TR')} – {new Date(rental.endDate).toLocaleDateString('tr-TR')}
                    </p>
                    {rental.requestedEndDate && (
                      <p className="text-blue-400 text-xs mt-1">📅 Talep edilen uzatma: {new Date(rental.requestedEndDate).toLocaleDateString('tr-TR')}</p>
                    )}
                    <div className="mt-3">{getStatusBadge(rental.rentalStatus)}</div>
                  </div>

                  <div className="flex flex-col gap-3 min-w-[220px]">

                    {/* Süre Uzatma */}
                    {rental.rentalStatus === 'aktif' && extendingId !== rental.documentId && (
                      <button
                        onClick={() => { setExtendingId(rental.documentId); setExtendDate(minExtend); }}
                        className="bg-white/[0.04] hover:bg-white/[0.08] text-white px-4 py-2 rounded-lg text-xs transition-all duration-300 border border-white/8 hover:border-white/15"
                      >
                        ⏩ Süreyi Uzat
                      </button>
                    )}
                    {extendingId === rental.documentId && (
                      <div className="bg-[#0a0a0a] p-3 rounded-lg border border-white/8 flex flex-col gap-2">
                        <label className="text-xs text-gray-500 font-semibold">
                          Yeni Bitiş Tarihi
                          <span className="text-gray-600 ml-1">(min. {new Date(minExtend).toLocaleDateString('tr-TR')})</span>
                        </label>
                        <input
                          type="date"
                          min={minExtend}
                          value={extendDate}
                          onChange={e => setExtendDate(e.target.value)}
                          className="bg-transparent border border-white/15 rounded p-1.5 text-xs text-white [color-scheme:dark]"
                        />
                        <div className="flex gap-2">
                          <button onClick={() => handleExtend(rental.documentId, currentEnd)} className="btn-primary px-3 py-1.5 rounded text-xs flex-1">Gönder</button>
                          <button onClick={() => { setExtendingId(null); setExtendDate(''); }} className="bg-white/5 hover:bg-white/10 text-white px-3 py-1.5 rounded text-xs flex-1 border border-white/8">İptal</button>
                        </div>
                      </div>
                    )}

                    {/* Erken Teslim */}
                    {rental.rentalStatus === 'aktif' && earlyReturnId !== rental.documentId && (
                      <button
                        onClick={() => { setEarlyReturnId(rental.documentId); setEarlyReturnDate(minEarlyReturn); }}
                        className="bg-orange-500/8 hover:bg-orange-500/15 text-orange-400 border border-orange-500/20 px-4 py-2 rounded-lg text-xs transition-all duration-300"
                      >
                        ⏪ Erken Teslim Yap
                      </button>
                    )}
                    {earlyReturnId === rental.documentId && (
                      <div className="bg-[#0a0a0a] p-3 rounded-lg border border-orange-500/15 flex flex-col gap-2">
                        <label className="text-xs text-orange-400 font-semibold">
                          Erken Teslim Tarihi
                          <span className="text-gray-600 ml-1">(min. {new Date(minEarlyReturn).toLocaleDateString('tr-TR')})</span>
                        </label>
                        <input
                          type="date"
                          min={minEarlyReturn}
                          max={currentEnd}
                          value={earlyReturnDate}
                          onChange={e => setEarlyReturnDate(e.target.value)}
                          className="bg-transparent border border-orange-500/20 rounded p-1.5 text-xs text-white [color-scheme:dark]"
                        />
                        <div className="flex gap-2">
                          <button onClick={() => handleEarlyReturn(rental.documentId, startD)} className="bg-orange-500 hover:bg-orange-600 text-black font-bold px-3 py-1.5 rounded text-xs flex-1">Onayla</button>
                          <button onClick={() => { setEarlyReturnId(null); setEarlyReturnDate(''); }} className="bg-white/5 hover:bg-white/10 text-white px-3 py-1.5 rounded text-xs flex-1 border border-white/8">İptal</button>
                        </div>
                      </div>
                    )}

                    {/* Standart İade Bildirimi */}
                    {rental.rentalStatus === 'aktif' && earlyReturnId !== rental.documentId && (
                      <button
                        onClick={() => handleReturn(rental.documentId)}
                        className="bg-white/[0.03] hover:bg-white/[0.06] text-gray-400 border border-white/8 px-4 py-2 rounded-lg text-xs transition-all duration-300"
                      >
                        📋 İade Bildirimi Yap
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Bekleyen İşlemler */}
      <section>
        <h2 className="text-2xl font-[family-name:var(--font-outfit)] font-bold mb-6 text-yellow-500 flex items-center gap-2">
          <span>⏳</span> Bekleyen İşlemler
        </h2>
        {pendingRentals.length === 0 ? (
          <p className="text-gray-600 italic px-4 text-sm">Bekleyen bir işlem veya talebiniz bulunmuyor.</p>
        ) : (
          <div className="grid gap-4">
            {pendingRentals.map(rental => (
              <div key={rental.documentId} className="glass-card p-5 rounded-xl flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg text-white">{rental.car?.brand} {rental.car?.model}</h3>
                  <p className="text-sm text-gray-500">{new Date(rental.startDate).toLocaleDateString('tr-TR')} – {new Date(rental.endDate).toLocaleDateString('tr-TR')}</p>
                </div>
                <div>{getStatusBadge(rental.rentalStatus)}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Geçmiş Kiralamalar */}
      {pastRentals.length > 0 && (
        <section>
          <h2 className="text-xl font-[family-name:var(--font-outfit)] font-bold mb-4 text-gray-500 flex items-center gap-2">
            <span>📋</span> Geçmiş Kiralamalar
          </h2>
          <div className="grid gap-4">
            {pastRentals.map(rental => (
              <div key={rental.documentId} className="bg-white/[0.02] p-4 rounded-xl border border-white/5 flex justify-between items-center hover:bg-white/[0.04] transition-colors duration-300">
                <div>
                  <h3 className="font-semibold text-gray-400">{rental.car?.brand} {rental.car?.model}</h3>
                  <p className="text-xs text-gray-600">{new Date(rental.startDate).toLocaleDateString('tr-TR')} – {new Date(rental.endDate).toLocaleDateString('tr-TR')}</p>
                </div>
                <div>{getStatusBadge(rental.rentalStatus)}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
