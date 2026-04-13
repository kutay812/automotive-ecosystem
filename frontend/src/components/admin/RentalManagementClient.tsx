'use client';

import { useEffect, useState } from 'react';
import { approveRental, rejectRental, approveExtension, rejectExtension, completeRental } from '@/app/actions/admin';
import { useRouter } from 'next/navigation';

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  bekliyor: { label: 'Onay Bekliyor', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' },
  aktif: { label: 'Aktif', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30' },
  uzatma_talep: { label: 'Uzatma Talebi', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
  iade_bildirildi: { label: 'İade Bildirimi', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30' },
  bitti: { label: 'Tamamlandı', color: 'text-gray-400', bg: 'bg-gray-500/10 border-gray-500/30' },
  iptal: { label: 'İptal', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
};

export default function RentalManagementClient({ rentals: initialRentals }: { rentals: any[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => router.refresh(), 10000);
    return () => clearInterval(interval);
  }, [router]);

  const filteredRentals = filter === 'all'
    ? initialRentals
    : initialRentals.filter((r: any) => r.rentalStatus === filter);

  const handleAction = async (action: Function, rentalId: string) => {
    setActionLoading(rentalId);
    const res = await (action as any)(rentalId);
    setActionLoading(null);
    if (res.error) alert(res.error);
    else router.refresh();
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });

  const filters = [
    { key: 'all', label: 'Tümü', count: initialRentals.length },
    { key: 'bekliyor', label: '⏳ Bekleyen', count: initialRentals.filter((r: any) => r.rentalStatus === 'bekliyor').length },
    { key: 'aktif', label: '🟢 Aktif', count: initialRentals.filter((r: any) => r.rentalStatus === 'aktif').length },
    { key: 'uzatma_talep', label: '🔵 Uzatma', count: initialRentals.filter((r: any) => r.rentalStatus === 'uzatma_talep').length },
    { key: 'iade_bildirildi', label: '🟠 İade', count: initialRentals.filter((r: any) => r.rentalStatus === 'iade_bildirildi').length },
    { key: 'bitti', label: '✔️ Biten', count: initialRentals.filter((r: any) => r.rentalStatus === 'bitti').length },
    { key: 'iptal', label: '❌ İptal', count: initialRentals.filter((r: any) => r.rentalStatus === 'iptal').length },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Kiralama Yönetimi</h1>
        <p className="text-gray-500 text-sm mt-1">Tüm kiralama taleplerini buradan yönetin</p>
      </div>

      {/* Filtreler */}
      <div className="flex flex-wrap gap-2">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-xs font-medium border transition-all ${
              filter === f.key
                ? 'bg-[#ff5a00]/10 text-[#ff5a00] border-[#ff5a00]/30'
                : 'bg-white/[0.03] text-gray-400 border-white/5 hover:border-white/10'
            }`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* Tablo */}
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-gray-500 text-xs uppercase tracking-wider">
                <th className="text-left p-4">Müşteri</th>
                <th className="text-left p-4">Araç</th>
                <th className="text-left p-4">Alış Ofisi</th>
                <th className="text-left p-4">Teslim Ofisi</th>
                <th className="text-left p-4">Başlangıç</th>
                <th className="text-left p-4">Bitiş</th>
                <th className="text-left p-4">Uzatma Tarihi</th>
                <th className="text-left p-4">Durum</th>
                <th className="text-right p-4">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {filteredRentals.map((rental: any) => {
                const cfg = statusConfig[rental.rentalStatus] || statusConfig.bekliyor;
                const userName = rental.user
                  ? `${rental.user.firstName || ''} ${rental.user.lastName || ''}`.trim() || rental.user.username || rental.user.email
                  : 'Bilinmiyor';
                const carName = rental.car ? `${rental.car.brand || ''} ${rental.car.model || ''}` : '-';

                return (
                  <tr key={rental.documentId} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                    <td className="p-4 font-medium transition-colors group-hover:text-primary">{userName}</td>
                    <td className="p-4 text-gray-300">{carName}</td>
                    <td className="p-4 text-gray-400 text-xs">{rental.pickupOffice}</td>
                    <td className="p-4 text-gray-400 text-xs">{rental.dropoffOffice}</td>
                    <td className="p-4 text-gray-400 font-mono text-xs">{formatDate(rental.startDate)}</td>
                    <td className="p-4 text-gray-400 font-mono text-xs">{formatDate(rental.endDate)}</td>
                    <td className="p-4">
                      {rental.requestedEndDate ? (
                        <span className="text-blue-400 font-mono text-xs font-bold bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">{formatDate(rental.requestedEndDate)}</span>
                      ) : (
                        <span className="text-gray-600">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold border inline-block ${cfg.bg} ${cfg.color}`}>
                        {cfg.label.toUpperCase()}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex gap-2 justify-end flex-wrap">
                        {rental.rentalStatus === 'bekliyor' && (
                          <>
                            <button 
                              onClick={() => { if(confirm(`${carName} için kiralama talebini onaylıyor musunuz?`)) handleAction(approveRental, rental.documentId); }} 
                              disabled={actionLoading === rental.documentId} 
                              className="bg-green-500 hover:bg-green-600 text-black px-3 py-1.5 rounded-lg text-[10px] font-black transition-all disabled:opacity-50"
                            >
                              ONAYLA
                            </button>
                            <button 
                              onClick={() => { if(confirm('Bu talebi reddetmek istediğinize emin misiniz?')) handleAction(rejectRental, rental.documentId); }} 
                              disabled={actionLoading === rental.documentId} 
                              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg text-[10px] border border-red-500/30 transition-all disabled:opacity-50 font-bold"
                            >
                              REDDET
                            </button>
                          </>
                        )}
                        {rental.rentalStatus === 'uzatma_talep' && (
                          <>
                            <button 
                              onClick={() => { if(confirm('Süre uzatma talebini onaylıyor musunuz?')) handleAction(approveExtension, rental.documentId); }} 
                              disabled={actionLoading === rental.documentId} 
                              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black transition-all disabled:opacity-50"
                            >
                              UZATMAYI ONAYLA
                            </button>
                            <button 
                              onClick={() => { if(confirm('Uzatma talebini reddetmek istediğinize emin misiniz?')) handleAction(rejectExtension, rental.documentId); }} 
                              disabled={actionLoading === rental.documentId} 
                              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg text-[10px] border border-red-500/30 transition-all disabled:opacity-50 font-bold"
                            >
                              REDDET
                            </button>
                          </>
                        )}
                        {/* Aktif veya İade Bildirildi ise Teslim Al Butonu */}
                        {(rental.rentalStatus === 'aktif' || rental.rentalStatus === 'iade_bildirildi') && (
                          <button 
                            onClick={() => { if(confirm('Aracın teslim alındığını ve kiralamanın bittiğini onaylıyor musunuz?')) handleAction(completeRental, rental.documentId); }} 
                            disabled={actionLoading === rental.documentId} 
                            className="bg-orange-500 hover:bg-orange-600 text-black px-3 py-1.5 rounded-lg text-[10px] font-black transition-all disabled:opacity-50"
                          >
                            TESLİM ALINDI
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredRentals.length === 0 && (
                <tr><td colSpan={9} className="p-12 text-center text-gray-600">Bu kategoride kiralama kaydı yok.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
