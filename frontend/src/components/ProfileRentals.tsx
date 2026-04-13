'use client';

import { useState } from 'react';
import { extendRental, returnNoticeRental } from '@/app/actions/rental';
import { useRouter } from 'next/navigation';

export default function ProfileRentals({ rentals }: { rentals: any[] }) {
  const router = useRouter();
  
  const [extendingId, setExtendingId] = useState<string | null>(null);
  const [extendDate, setExtendDate] = useState('');

  const handleExtend = async (rentalId: string) => {
    if (!extendDate) {
      alert("Lütfen uzatmak istediğiniz tarihi seçin.");
      return;
    }
    const res = await extendRental(rentalId, extendDate);
    if (res.error) alert(res.error);
    else {
      alert("Uzatma talebiniz yöneticiye iletildi.");
      setExtendingId(null);
      router.refresh();
    }
  };

  const handleReturn = async (rentalId: string) => {
    if (confirm("Aracı yarın teslim edeceğinizi bildirmek istediğinize emin misiniz?")) {
      const res = await returnNoticeRental(rentalId);
      if (res.error) alert(res.error);
      else {
        alert("İade işleminiz kaydedildi. Ofisimizde aracı teslim edebilirsiniz.");
        router.refresh();
      }
    }
  };

  const pendingRentals = rentals.filter(r => r.rentalStatus === 'bekliyor');
  const activeRentals = rentals.filter(r => r.rentalStatus === 'aktif' || r.rentalStatus === 'uzatma_talep' || r.rentalStatus === 'iade_bildirildi');
  const pastRentals = rentals.filter(r => r.rentalStatus === 'bitti' || r.rentalStatus === 'iptal');

  const getStatusText = (status: string) => {
    switch(status) {
      case 'bekliyor': return <span className="text-yellow-500">Onay Bekliyor</span>;
      case 'aktif': return <span className="text-green-500">Aktif (Kullanımda)</span>;
      case 'uzatma_talep': return <span className="text-blue-500">Süre Uzatma Onayı Bekleniyor</span>;
      case 'iade_bildirildi': return <span className="text-orange-500">İade Edilecek</span>;
      case 'bitti': return <span className="text-gray-500">Tamamlandı</span>;
      case 'iptal': return <span className="text-red-500">İptal Edildi</span>;
      default: return status;
    }
  };

  // Turkey UTC+3
  const todayDate = new Date();
  todayDate.setHours(todayDate.getHours() + 3);
  const todayStr = todayDate.toISOString().split('T')[0];

  return (
    <div className="space-y-12">
      {/* Aktif Kiralamalar */}
      <section>
        <h2 className="text-2xl font-bold mb-6 text-primary flex items-center gap-2">
          <span>🟢</span> Aktif Kiralamalarım
        </h2>
        {activeRentals.length === 0 ? (
          <p className="text-gray-500 italic px-4">Aktif kiraladığınız bir araç bulunmuyor.</p>
        ) : (
          <div className="grid gap-6">
            {activeRentals.map(rental => (
              <div key={rental.documentId} className="glass p-6 rounded-2xl border border-primary/20 flex flex-col md:flex-row justify-between gap-6">
                <div>
                  <h3 className="text-xl font-bold">{rental.car?.brand} {rental.car?.model}</h3>
                  <p className="text-gray-400 mt-1">Alış: {rental.pickupOffice} ➔ Teslim: {rental.dropoffOffice}</p>
                  <p className="text-gray-300 mt-1 font-mono text-sm">
                    {new Date(rental.startDate).toLocaleDateString('tr-TR')} - {new Date(rental.endDate).toLocaleDateString('tr-TR')}
                  </p>
                  <div className="mt-3 font-semibold text-sm">
                    Durum: {getStatusText(rental.rentalStatus)}
                  </div>
                </div>
                
                <div className="flex flex-col gap-3 min-w-[200px]">
                  {/* Uzatma Alanı */}
                  {rental.rentalStatus === 'aktif' && extendingId !== rental.documentId && (
                    <button onClick={() => setExtendingId(rental.documentId)} className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm transition-colors border border-white/10">
                      Süreyi Uzat
                    </button>
                  )}
                  {extendingId === rental.documentId && (
                    <div className="bg-black/50 p-3 rounded-lg border border-white/10 flex flex-col gap-2">
                      <label className="text-xs text-gray-400">Yeni Bitiş Tarihi:</label>
                      <input type="date" min={todayStr} value={extendDate} onChange={e => setExtendDate(e.target.value)} className="bg-transparent border border-white/20 rounded p-1 text-sm [color-scheme:dark]" />
                      <div className="flex gap-2">
                        <button onClick={() => handleExtend(rental.documentId)} className="bg-primary/80 hover:bg-primary text-black font-bold px-2 py-1 rounded text-xs flex-1">Gönder</button>
                        <button onClick={() => setExtendingId(null)} className="bg-gray-600 hover:bg-gray-500 text-white px-2 py-1 rounded text-xs flex-1">İptal</button>
                      </div>
                    </div>
                  )}

                  {/* İade Butonu */}
                  {rental.rentalStatus === 'aktif' && (
                    <button onClick={() => handleReturn(rental.documentId)} className="bg-orange-500/20 hover:bg-orange-500/40 text-orange-400 border border-orange-500/30 px-4 py-2 rounded-lg text-sm transition-colors">
                      Sonlandırma (İade) Bildirimi Yap
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Bekleyen İşlemler */}
      <section>
        <h2 className="text-2xl font-bold mb-6 text-yellow-500 flex items-center gap-2">
          <span>⏳</span> Bekleyen İşlemler
        </h2>
        {pendingRentals.length === 0 ? (
          <p className="text-gray-500 italic px-4">Bekleyen bir işlem veya talebiniz bulunmuyor.</p>
        ) : (
          <div className="grid gap-4">
            {pendingRentals.map(rental => (
              <div key={rental.documentId} className="glass p-5 rounded-2xl border border-white/10 flex justify-between items-center opacity-80">
                <div>
                  <h3 className="font-bold text-lg">{rental.car?.brand} {rental.car?.model}</h3>
                  <p className="text-sm text-gray-400">{new Date(rental.startDate).toLocaleDateString('tr-TR')} - {new Date(rental.endDate).toLocaleDateString('tr-TR')}</p>
                </div>
                <div className="text-right">
                  <span className="bg-yellow-500/20 text-yellow-500 px-3 py-1 rounded-full text-xs border border-yellow-500/30">
                    Otomobil Hazırlanıyor
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Geçmiş Kiralamalar */}
      {pastRentals.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4 text-gray-500 flex items-center gap-2">
            <span>📋</span> Geçmiş Kiralamalar
          </h2>
          <div className="grid gap-4">
            {pastRentals.map(rental => (
              <div key={rental.documentId} className="bg-white/5 p-4 rounded-2xl border border-white/5 flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-gray-300">{rental.car?.brand} {rental.car?.model}</h3>
                  <p className="text-xs text-gray-500">{new Date(rental.startDate).toLocaleDateString('tr-TR')} - {new Date(rental.endDate).toLocaleDateString('tr-TR')}</p>
                </div>
                <div>{getStatusText(rental.rentalStatus)}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
