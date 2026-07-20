'use client';

import { useState } from 'react';
import { updateSupportTicketStatus } from '@/app/actions/admin';
import { useRouter } from 'next/navigation';

const statusConfig: Record<string, { label: string; cls: string; icon: string }> = {
  open:     { label: 'Açık',     cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: '🟡' },
  read:     { label: 'Okundu',   cls: 'bg-blue-500/20 text-blue-400 border-blue-500/30',     icon: '🔵' },
  resolved: { label: 'Çözüldü',  cls: 'bg-green-500/20 text-green-400 border-green-500/30',  icon: '🟢' },
};

export default function SupportManagementClient({ tickets: initialTickets }: { tickets: any[] }) {
  const router = useRouter();
  const [tickets, setTickets] = useState(initialTickets);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [loading, setLoading] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'open' | 'read' | 'resolved'>('all');

  const filtered = filter === 'all' ? tickets : tickets.filter(t => t.status === filter);

  const handleStatusChange = async (ticketId: number, newStatus: string) => {
    setLoading(ticketId);
    const res = await updateSupportTicketStatus(ticketId, newStatus);
    if (res && 'error' in res && res.error) {
      alert(res.error);
    } else {
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));
      if (selectedTicket?.id === ticketId) setSelectedTicket({ ...selectedTicket, status: newStatus });
    }
    setLoading(null);
    router.refresh();
  };

  const openCount = tickets.filter(t => t.status === 'open').length;
  const readCount = tickets.filter(t => t.status === 'read').length;
  const resolvedCount = tickets.filter(t => t.status === 'resolved').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">📨 Destek / Gelen Kutusu</h1>
          <p className="text-sm text-gray-500 mt-1">Kullanıcılardan gelen destek taleplerini yönetin</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Toplam', value: tickets.length, color: 'text-white', bg: 'bg-white/5' },
          { label: 'Açık', value: openCount, color: 'text-yellow-400', bg: 'bg-yellow-500/5' },
          { label: 'Okundu', value: readCount, color: 'text-blue-400', bg: 'bg-blue-500/5' },
          { label: 'Çözüldü', value: resolvedCount, color: 'text-green-400', bg: 'bg-green-500/5' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border border-white/10 rounded-xl p-4`}>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(['all', 'open', 'read', 'resolved'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              filter === f
                ? 'bg-[#ff5a00]/10 text-[#ff5a00] border border-[#ff5a00]/30'
                : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
            }`}
          >
            {f === 'all' ? 'Tümü' : statusConfig[f]?.label || f}
          </button>
        ))}
      </div>

      {/* Table + Detail Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket Table */}
        <div className={`${selectedTicket ? 'lg:col-span-2' : 'lg:col-span-3'} bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden`}>
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <div className="text-4xl mb-3">📭</div>
              <p>Bu kategoride talep bulunamadı.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left">
                    <th className="px-4 py-3 text-xs text-gray-500 font-semibold">#</th>
                    <th className="px-4 py-3 text-xs text-gray-500 font-semibold">Durum</th>
                    <th className="px-4 py-3 text-xs text-gray-500 font-semibold">Konu</th>
                    <th className="px-4 py-3 text-xs text-gray-500 font-semibold">Gönderen</th>
                    <th className="px-4 py-3 text-xs text-gray-500 font-semibold">Tarih</th>
                    <th className="px-4 py-3 text-xs text-gray-500 font-semibold">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(ticket => {
                    const cfg = statusConfig[ticket.status] || statusConfig.open;
                    const isSelected = selectedTicket?.id === ticket.id;
                    return (
                      <tr
                        key={ticket.id}
                        onClick={() => { setSelectedTicket(ticket); if (ticket.status === 'open') handleStatusChange(ticket.id, 'read'); }}
                        className={`border-b border-white/5 cursor-pointer transition-colors ${
                          isSelected ? 'bg-[#ff5a00]/5' : 'hover:bg-white/[0.03]'
                        } ${ticket.status === 'open' ? 'font-semibold' : ''}`}
                      >
                        <td className="px-4 py-3 text-gray-500 text-xs">#{ticket.id}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${cfg.cls}`}>
                            {cfg.icon} {cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-white max-w-[200px] truncate">{ticket.subject}</td>
                        <td className="px-4 py-3">
                          <div className="text-white text-xs">{ticket.name}</div>
                          <div className="text-gray-500 text-[10px]">{ticket.email}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                          {new Date(ticket.createdAt).toLocaleDateString('tr-TR')}
                        </td>
                        <td className="px-4 py-3">
                          {ticket.status !== 'resolved' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleStatusChange(ticket.id, 'resolved'); }}
                              disabled={loading === ticket.id}
                              className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/30 px-2.5 py-1 rounded-lg hover:bg-green-500/20 transition-colors disabled:opacity-50"
                            >
                              {loading === ticket.id ? '...' : '✓ Çözüldü'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedTicket && (
          <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Talep Detayı</h3>
              <button onClick={() => setSelectedTicket(null)} className="text-gray-500 hover:text-white text-sm">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Durum</label>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${(statusConfig[selectedTicket.status] || statusConfig.open).cls}`}>
                  {(statusConfig[selectedTicket.status] || statusConfig.open).icon} {(statusConfig[selectedTicket.status] || statusConfig.open).label}
                </span>
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Konu</label>
                <p className="text-white text-sm font-medium">{selectedTicket.subject}</p>
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Gönderen</label>
                <p className="text-white text-sm">{selectedTicket.name}</p>
                <p className="text-gray-400 text-xs">{selectedTicket.email}</p>
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Tarih</label>
                <p className="text-gray-400 text-xs">{new Date(selectedTicket.createdAt).toLocaleString('tr-TR')}</p>
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Mesaj</label>
                <div className="bg-black/30 rounded-lg p-4 border border-white/5">
                  <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">{selectedTicket.message}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t border-white/5">
              {selectedTicket.status === 'open' && (
                <button
                  onClick={() => handleStatusChange(selectedTicket.id, 'read')}
                  disabled={loading === selectedTicket.id}
                  className="flex-1 text-xs bg-blue-500/10 text-blue-400 border border-blue-500/30 px-3 py-2 rounded-lg hover:bg-blue-500/20 transition-colors disabled:opacity-50"
                >
                  🔵 Okundu
                </button>
              )}
              {selectedTicket.status !== 'resolved' && (
                <button
                  onClick={() => handleStatusChange(selectedTicket.id, 'resolved')}
                  disabled={loading === selectedTicket.id}
                  className="flex-1 text-xs bg-green-500/10 text-green-400 border border-green-500/30 px-3 py-2 rounded-lg hover:bg-green-500/20 transition-colors disabled:opacity-50"
                >
                  🟢 Çözüldü
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
