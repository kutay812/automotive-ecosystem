'use client';

import { useEffect, useState } from 'react';
import { approveRental, rejectRental, approveExtension, rejectExtension, completeRental, approveEarlyReturn, rejectEarlyReturn, markRentalPaymentPaid, unmarkRentalPaymentPaid } from '@/app/actions/admin';
import { useRouter } from 'next/navigation';

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  bekliyor:           { label: 'Onay Bekliyor',          color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' },
  aktif:              { label: 'Aktif',                   color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/30' },
  uzatma_talep:       { label: 'Uzatma Talebi',           color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/30' },
  erken_teslim_talep: { label: 'Erken Teslim Talebi',    color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30' },
  iade_bildirildi:    { label: 'İade Bildirimi',           color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30' },
  bitti:              { label: 'Tamamlandı',             color: 'text-gray-400',   bg: 'bg-gray-500/10 border-gray-500/30' },
  iptal:              { label: 'İptal',                  color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/30' },
};

const approvalConfig: Record<string, { label: string; color: string; bg: string }> = {
  waiting_admin: { label: 'Onay Bekliyor', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' },
  approved:      { label: 'Onaylandı',     color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/30' },
  rejected:      { label: 'Reddedildi',    color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/30' },
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
    : filter === 'waiting_admin' 
      ? initialRentals.filter((r: any) => r.approvalStatus === 'waiting_admin')
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
    { key: 'all',                label: 'Tümü',       count: initialRentals.length },
    { key: 'waiting_admin',      label: '⚠️ Onay Bekleyen', count: initialRentals.filter((r: any) => r.approvalStatus === 'waiting_admin').length },
    { key: 'bekliyor',           label: '⏳ Bekleyen (Durum)', count: initialRentals.filter((r: any) => r.rentalStatus === 'bekliyor').length },
    { key: 'aktif',              label: '🟢 Aktif',     count: initialRentals.filter((r: any) => r.rentalStatus === 'aktif').length },
    { key: 'uzatma_talep',       label: '🔵 Uzatma',    count: initialRentals.filter((r: any) => r.rentalStatus === 'uzatma_talep').length },
    { key: 'erken_teslim_talep', label: '🟣 Erken Tes.', count: initialRentals.filter((r: any) => r.rentalStatus === 'erken_teslim_talep').length },
    { key: 'iade_bildirildi',    label: '🟠 İade',       count: initialRentals.filter((r: any) => r.rentalStatus === 'iade_bildirildi').length },
    { key: 'bitti',              label: '✔️ Biten',      count: initialRentals.filter((r: any) => r.rentalStatus === 'bitti').length },
    { key: 'iptal',              label: '❌ İptal',       count: initialRentals.filter((r: any) => r.rentalStatus === 'iptal').length },
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
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-gray-400 text-[11px] uppercase tracking-wider bg-white/[0.01]">
                <th className="text-left p-5 font-bold">Müşteri</th>
                <th className="text-left p-5 font-bold">Araç & Güzergah</th>
                <th className="text-left p-5 font-bold">Kiralama Dönemi</th>
                <th className="text-left p-5 font-bold">Durum & Ödeme</th>
                <th className="text-right p-5 font-bold pr-6">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredRentals.map((rental: any) => {
                const cfg = statusConfig[rental.rentalStatus] || statusConfig.bekliyor;
                const userName = rental.user
                  ? `${rental.user.firstName || ''} ${rental.user.lastName || ''}`.trim() || rental.user.username || rental.user.email
                  : 'Bilinmiyor';
                const carName = rental.car ? `${rental.car.brand || ''} ${rental.car.model || ''}` : '-';

                return (
                  <tr key={rental.documentId} className="hover:bg-white/[0.02] transition-colors group">
                    {/* Müşteri Bilgileri */}
                    <td className="p-5 align-middle">
                      <div className="font-semibold text-white text-sm tracking-wide group-hover:text-primary transition-colors">{userName}</div>
                      <div className="text-xs text-gray-500 mt-1 font-medium">{rental.user?.email}</div>
                      {rental.user?.phoneNumber && (
                        <div className="text-[10px] text-gray-600 font-mono mt-1 flex items-center gap-1">
                          <span>📞</span> {rental.user.phoneNumber}
                        </div>
                      )}
                    </td>

                    {/* Araç & Güzergah */}
                    <td className="p-5 align-middle">
                      <div className="font-bold text-white text-sm tracking-wide">{carName}</div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 mt-1.5 font-semibold bg-white/[0.03] border border-white/5 px-2.5 py-1 rounded-lg w-fit">
                        <span className="text-gray-500">📍</span>
                        <span>{rental.pickupOffice}</span>
                        <span className="text-gray-600 font-normal">→</span>
                        <span>{rental.dropoffOffice}</span>
                      </div>
                    </td>

                    {/* Kiralama Dönemi */}
                    <td className="p-5 align-middle text-xs space-y-1.5">
                      <div className="flex items-center gap-2 text-gray-300">
                        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider min-w-[65px] inline-block">Başlangıç:</span>
                        <span className="font-mono bg-white/5 px-1.5 py-0.5 rounded text-gray-300">{formatDate(rental.startDate)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-300">
                        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider min-w-[65px] inline-block">Bitiş:</span>
                        <span className="font-mono bg-white/5 px-1.5 py-0.5 rounded text-gray-300">{formatDate(rental.endDate)}</span>
                      </div>
                      {rental.requestedEndDate && (
                        <div className="text-[9px] text-purple-400 font-black bg-purple-500/10 border border-purple-500/20 px-2 py-1 rounded-lg w-fit mt-1 flex items-center gap-1.5 animate-pulse">
                          <span>⏳ Erken Teslim Talebi:</span>
                          <span className="font-mono">{formatDate(rental.requestedEndDate)}</span>
                        </div>
                      )}
                    </td>

                    {/* Durum & Ödeme */}
                    <td className="p-5 align-middle space-y-2.5">
                      {/* Statüler */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black border inline-block tracking-wider ${cfg.bg} ${cfg.color}`}>
                          {cfg.label.toUpperCase()}
                        </div>
                        {rental.approvalStatus && approvalConfig[rental.approvalStatus] && (
                          <div className={`px-2 py-0.5 rounded text-[9px] font-bold border inline-block tracking-wider ${approvalConfig[rental.approvalStatus].bg} ${approvalConfig[rental.approvalStatus].color}`}>
                            {approvalConfig[rental.approvalStatus].label.toUpperCase()}
                          </div>
                        )}
                      </div>

                      {/* Ödeme Yönetimi */}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] uppercase font-black text-gray-400 bg-white/5 px-2 py-1 rounded-lg border border-white/10 tracking-wider">
                          {rental.paymentMethod === 'online' ? '💳 Online' : '💵 Ofis'}
                        </span>

                        {rental.paymentMethod === 'ofis' || rental.paymentMethod === 'office' ? (
                          <label className={`flex items-center gap-1.5 select-none border border-white/5 px-2 py-0.5 rounded-lg transition-colors ${
                            (rental.rentalStatus === 'bitti' || rental.rentalStatus === 'iptal')
                              ? 'opacity-50 cursor-not-allowed bg-white/[0.01]'
                              : 'cursor-pointer hover:bg-white/[0.04] bg-white/[0.02] group/pay'
                          }`}>
                            <input
                              type="checkbox"
                              checked={rental.paymentStatus === 'paid'}
                              disabled={actionLoading === rental.documentId || rental.rentalStatus === 'bitti' || rental.rentalStatus === 'iptal'}
                              onChange={async (e) => {
                                const newPaid = e.target.checked;
                                if (confirm(newPaid ? 'Ödemenin ofisten nakit veya kartla tahsil edildiğini onaylıyor musunuz?' : 'Ödeme durumunu tekrar bekliyor olarak değiştirmek istediğinize emin misiniz?')) {
                                  handleAction(newPaid ? markRentalPaymentPaid : unmarkRentalPaymentPaid, rental.documentId);
                                }
                              }}
                              className="w-3.5 h-3.5 rounded border-white/10 bg-black/40 text-primary accent-[#ff5a00] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <span className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded transition-all ${
                              rental.paymentStatus === 'paid' 
                                ? 'text-green-400' 
                                : 'text-yellow-400'
                            }`}>
                              {rental.paymentStatus === 'paid' ? 'Ödendi' : 'Ödeme Al'}
                            </span>
                          </label>
                        ) : (
                          <span className={`text-[9px] uppercase font-black px-2 py-1 rounded-lg border tracking-wider ${
                            rental.paymentStatus === 'paid' ? 'text-green-400 bg-green-500/10 border-green-500/30' : 
                            rental.paymentStatus === 'pending' ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' : 
                            'text-orange-400 bg-orange-500/10 border-orange-500/30'
                          }`}>
                            {rental.paymentStatus === 'paid' ? 'Ödendi' : 'Bekliyor'}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* İşlemler */}
                    <td className="p-5 align-middle text-right pr-6">
                      <div className="flex gap-2 justify-end items-center flex-wrap max-w-[280px] ml-auto">
                        {/* Onay Bekleyen Durumlar İçin Aksiyonlar */}
                        {rental.approvalStatus === 'waiting_admin' && (
                          <>
                            {rental.rentalStatus === 'bekliyor' && (
                              <button 
                                onClick={() => { if(confirm(`${carName} için kiralama talebini onaylıyor musunuz?`)) handleAction(approveRental, rental.documentId); }} 
                                disabled={actionLoading === rental.documentId} 
                                className="bg-green-500 hover:bg-green-600 text-black px-3.5 py-2 rounded-xl text-[10px] font-black transition-all disabled:opacity-50 shadow-lg shadow-green-500/10"
                              >
                                ONAYLA
                              </button>
                            )}
                            {rental.rentalStatus === 'uzatma_talep' && (
                              <button 
                                onClick={() => { if(confirm('Süre uzatma talebini onaylıyor musunuz?')) handleAction(approveExtension, rental.documentId); }} 
                                disabled={actionLoading === rental.documentId} 
                                className="bg-blue-500 hover:bg-blue-600 text-white px-3.5 py-2 rounded-xl text-[10px] font-black transition-all disabled:opacity-50 shadow-lg shadow-blue-500/10"
                              >
                                UZATMAYI ONAYLA
                              </button>
                            )}
                            {(rental.rentalStatus === 'erken_teslim_talep' || (rental.rentalStatus === 'iade_bildirildi' && rental.requestedEndDate)) && (
                              <button
                                onClick={() => { if(confirm(`Erken teslim talebini onaylıyor musunuz?\n\nOnaylandıktan sonra kiralama "İade Aşaması"na geçecek.\nAraç fiziksel olarak teslim alındığında "TESLİM ALINDI" butonuna basın.`)) handleAction(approveEarlyReturn, rental.documentId); }}
                                disabled={actionLoading === rental.documentId}
                                className="bg-purple-500 hover:bg-purple-600 text-white px-3.5 py-2 rounded-xl text-[10px] font-black transition-all disabled:opacity-50 shadow-lg shadow-purple-500/10"
                              >
                                ERKEN İADEYİ ONAYLA
                              </button>
                            )}
                            
                            {/* Ortak Reddetme Butonu */}
                            <button 
                              onClick={() => { 
                                if(confirm('Bu talebi reddetmek istediğinize emin misiniz?')) {
                                  if (rental.rentalStatus === 'bekliyor') handleAction(rejectRental, rental.documentId);
                                  else if (rental.rentalStatus === 'uzatma_talep') handleAction(rejectExtension, rental.documentId);
                                  else if (rental.rentalStatus === 'erken_teslim_talep' || rental.rentalStatus === 'iade_bildirildi') handleAction(rejectEarlyReturn, rental.documentId);
                                }
                              }} 
                              disabled={actionLoading === rental.documentId} 
                              className="bg-red-500/10 hover:bg-red-500/25 text-red-400 px-3.5 py-2 rounded-xl text-[10px] border border-red-500/20 hover:border-red-500/30 transition-all disabled:opacity-50 font-bold"
                            >
                              REDDET
                            </button>
                          </>
                        )}
                        
                        {/* Ofiste Ödemeli ve Ödenmemişse, Ödeme Alındı Butonu Göster */}
                        {(rental.paymentMethod === 'ofis' || rental.paymentMethod === 'office') && rental.paymentStatus !== 'paid' && rental.rentalStatus !== 'iptal' && (
                          <button
                            onClick={() => { if(confirm('Ödemenin ofisten tahsil edildiğini ve alındığını onaylıyor musunuz?')) handleAction(markRentalPaymentPaid, rental.documentId); }}
                            disabled={actionLoading === rental.documentId}
                            className="bg-green-500 hover:bg-green-600 text-black px-3.5 py-2 rounded-xl text-[10px] font-black transition-all disabled:opacity-50 flex items-center gap-1 shadow-lg shadow-green-500/10"
                          >
                            💸 ÖDEME ALINDI
                          </button>
                        )}
                        
                        {/* Aktif veya İade Bildirildi ise Teslim Al Butonu */}
                        {(rental.rentalStatus === 'aktif' || rental.rentalStatus === 'iade_bildirildi') && (
                          <button 
                            onClick={() => { if(confirm('Aracın teslim alındığını ve kiralamanın bittiğini onayloyor musunuz?')) handleAction(completeRental, rental.documentId); }} 
                            disabled={actionLoading === rental.documentId} 
                            className="bg-orange-500 hover:bg-orange-600 text-black px-3.5 py-2 rounded-xl text-[10px] font-black transition-all disabled:opacity-50 shadow-lg shadow-orange-500/10"
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
                <tr><td colSpan={5} className="p-16 text-center text-gray-500 font-medium">Bu kategoride kiralama kaydı yok.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
