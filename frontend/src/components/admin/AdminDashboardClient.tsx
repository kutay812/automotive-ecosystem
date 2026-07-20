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

function StatCard({ icon, label, value, accent }: { icon: string; label: string; value: number; accent?: string }) {
  return (
    <div className="bg-white/[0.03] backdrop-blur-sm border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-all">
      <div className="flex items-center justify-between mb-4">
        <span className="text-2xl">{icon}</span>
        {accent && <span className={`text-xs font-bold px-2 py-1 rounded-full ${accent}`}>{value}</span>}
      </div>
      <p className="text-3xl font-black">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </div>
  );
}

export default function AdminDashboardClient({ stats, recentRentals: initialRentals }: { stats: any; recentRentals: any[] }) {
  const router = useRouter();
  const [rentals, setRentals] = useState(initialRentals);
  const [currentStats, setCurrentStats] = useState(stats);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Otomatik yenileme (her 10 saniye)
  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 10000);
    return () => clearInterval(interval);
  }, [router]);

  // Props değiştiğinde state'i güncelle
  useEffect(() => {
    setRentals(initialRentals);
    setCurrentStats(stats);
  }, [initialRentals, stats]);

  const handleAction = async (action: Function, rentalId: string) => {
    setActionLoading(rentalId);
    const res = await (action as any)(rentalId);
    setActionLoading(null);
    if (res.error) {
      alert(res.error);
    } else {
      router.refresh();
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Gösterge Paneli</h1>
        <p className="text-gray-500 text-sm mt-1">Example Kiralama Yönetim Merkezi</p>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon="🚗" label="Toplam Araç" value={currentStats?.totalCars || 0} />
        <StatCard icon="✅" label="Müsait Araç" value={currentStats?.availableCars || 0} />
        <StatCard icon="👥" label="Kullanıcılar" value={currentStats?.totalUsers || 0} />
        <StatCard icon="🖼️" label="Medya" value={currentStats?.totalMedia || 0} />
        <StatCard icon="🟢" label="Aktif Kiralama" value={currentStats?.active || 0} accent="bg-green-500/20 text-green-400" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon="⏳" label="Onay Bekleyen" value={currentStats?.pending || 0} accent="bg-yellow-500/20 text-yellow-400" />
        <StatCard icon="🔵" label="Uzatma Talebi" value={currentStats?.extensionRequests || 0} accent="bg-blue-500/20 text-blue-400" />
        <StatCard icon="🟠" label="İade Bildirimi" value={currentStats?.returnNotices || 0} accent="bg-orange-500/20 text-orange-400" />
        <StatCard icon="✔️" label="Tamamlanan" value={currentStats?.completed || 0} />
        <StatCard icon="❌" label="İptal" value={currentStats?.cancelled || 0} />
      </div>

      {/* Son İşlemler */}
      <div>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          Son İşlemler
          <span className="text-xs text-gray-500 font-normal">(Otomatik yenileniyor)</span>
        </h2>
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="text-left p-4">Müşteri</th>
                  <th className="text-left p-4">Araç</th>
                  <th className="text-left p-4">Başlangıç</th>
                  <th className="text-left p-4">Bitiş</th>
                  <th className="text-left p-4">Uzatma</th>
                  <th className="text-left p-4">Durum</th>
                  <th className="text-right p-4">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {rentals.map((rental: any) => {
                  const cfg = statusConfig[rental.rentalStatus] || statusConfig.bekliyor;
                  const userName = rental.user
                    ? `${rental.user.firstName || ''} ${rental.user.lastName || ''}`.trim() || rental.user.username || rental.user.email
                    : 'Bilinmiyor';
                  const carName = rental.car ? `${rental.car.brand || ''} ${rental.car.model || ''}` : '-';

                  return (
                    <tr key={rental.documentId} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="p-4 font-medium">{userName}</td>
                      <td className="p-4 text-gray-400">{carName}</td>
                      <td className="p-4 text-gray-400 font-mono text-xs">{formatDate(rental.startDate)}</td>
                      <td className="p-4 text-gray-400 font-mono text-xs">{formatDate(rental.endDate)}</td>
                      <td className="p-4">
                        {rental.requestedEndDate ? (
                          <span className="text-blue-400 font-mono text-xs font-bold">{formatDate(rental.requestedEndDate)}</span>
                        ) : (
                          <span className="text-gray-600">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs border ${cfg.bg} ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex gap-2 justify-end">
                          {rental.rentalStatus === 'bekliyor' && (
                            <>
                              <button onClick={() => handleAction(approveRental, rental.documentId)} disabled={actionLoading === rental.documentId} className="bg-green-500/20 hover:bg-green-500/30 text-green-400 px-3 py-1 rounded-lg text-xs border border-green-500/30 transition-all disabled:opacity-50">Onayla</button>
                              <button onClick={() => handleAction(rejectRental, rental.documentId)} disabled={actionLoading === rental.documentId} className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-1 rounded-lg text-xs border border-red-500/30 transition-all disabled:opacity-50">Reddet</button>
                            </>
                          )}
                          {rental.rentalStatus === 'uzatma_talep' && (
                            <>
                              <button onClick={() => handleAction(approveExtension, rental.documentId)} disabled={actionLoading === rental.documentId} className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-3 py-1 rounded-lg text-xs border border-blue-500/30 transition-all disabled:opacity-50">Uzatmayı Onayla</button>
                              <button onClick={() => handleAction(rejectExtension, rental.documentId)} disabled={actionLoading === rental.documentId} className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-1 rounded-lg text-xs border border-red-500/30 transition-all disabled:opacity-50">Reddet</button>
                            </>
                          )}
                          {rental.rentalStatus === 'iade_bildirildi' && (
                            <button onClick={() => handleAction(completeRental, rental.documentId)} disabled={actionLoading === rental.documentId} className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 px-3 py-1 rounded-lg text-xs border border-orange-500/30 transition-all disabled:opacity-50">Teslim Alındı</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {rentals.length === 0 && (
                  <tr><td colSpan={7} className="p-8 text-center text-gray-600">Henüz kiralama kaydı yok.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
