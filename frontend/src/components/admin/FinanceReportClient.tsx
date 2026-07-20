'use client';

import { useState, useTransition, useCallback, useEffect } from 'react';
import { fetchFinanceReport } from '@/app/actions/admin';

interface Transaction {
  id: number;
  documentId: string;
  transactionType: 'rental' | 'product_sale';
  car: string;
  customerName: string;
  customerEmail: string;
  paymentType: string;
  startDate: string | null;
  endDate: string | null;
  requestedEndDate: string | null;
  days: number;
  pricePerDay: number;
  total: number;
  status: 'completed' | 'cancelled';
  isEarlyReturn: boolean;
  earlyReturnDays: number;
  refundAmount: number;
  rentalStatus?: string;
  completedAt: string;
}

interface FinanceReport {
  period: string;
  startDate: string;
  endDate: string;
  summary: {
    grossRevenue: number;
    cancelledAmount: number;
    netRevenue: number;
    transactionCount: number;
    cancelledCount: number;
    projectedRevenue: number;
    activeRentalCount: number;
    earlyReturnCount: number;
    totalEarlyReturnRefund: number;
    rentalGross: number;
    rentalCancelled: number;
    ecommerceGross: number;
    ecommerceCancelled: number;
    rentalCount: number;
    ecommerceCount: number;
    ecommerceCancelledCount: number;
  };
  carBreakdown: { brand: string; model: string; revenue: number; count: number }[];
  officeBreakdown: { name: string; revenue: number; count: number }[];
  allTransactions: Transaction[];
}

const periods = [
  { key: 'today', label: 'Bugün', icon: '📅' },
  { key: 'weekly', label: 'Haftalık', icon: '📆' },
  { key: 'monthly', label: 'Aylık', icon: '🗓️' },
  { key: 'semi-annual', label: '6 Aylık', icon: '📊' },
  { key: 'yearly', label: 'Yıllık', icon: '📈' },
  { key: 'custom', label: 'Özel Tarih', icon: '🎨' },
];

type FilterTab = 'all' | 'completed' | 'cancelled' | 'early' | 'ecommerce';

const periodLabels: Record<string, string> = {
  today: 'Gün Sonu Raporu',
  weekly: 'Haftalık Rapor',
  monthly: 'Aylık Rapor',
  'semi-annual': '6 Aylık Rapor',
  yearly: 'Yıllık Rapor',
  custom: 'Özel Dönem Raporu',
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatShortDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function StatusBadge({ tx }: { tx: Transaction }) {
  if (tx.status === 'cancelled') {
    return (
      <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
        🚫 İptal / İade
      </span>
    );
  }
  if (tx.isEarlyReturn) {
    return (
      <span className="inline-flex items-center gap-1 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
        ⏰ Erken Teslim ({tx.earlyReturnDays}g)
      </span>
    );
  }
  if (tx.rentalStatus === 'aktif') {
    return (
      <span className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
        🟢 Aktif (Ödendi)
      </span>
    );
  }
  if (tx.rentalStatus === 'bekliyor') {
    return (
      <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
        ⏳ Bekliyor (Ödendi)
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
      ✅ Tamamlandı
    </span>
  );
}

export default function FinanceReportClient({ initialReport }: { initialReport: FinanceReport | null }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [report, setReport] = useState<FinanceReport | null>(initialReport);
  const [activePeriod, setActivePeriod] = useState('monthly');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [isPending, startTransition] = useTransition();

  // Helper to format Date into YYYY-MM-DD
  const formatInputDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Default custom range inputs to last 30 days
  const defaultStartDate = () => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return formatInputDate(d);
  };
  const defaultEndDate = () => {
    return formatInputDate(new Date());
  };

  const [startDateInput, setStartDateInput] = useState(defaultStartDate());
  const [endDateInput, setEndDateInput] = useState(defaultEndDate());

  const handlePeriodChange = (period: string) => {
    setActivePeriod(period);
    if (period === 'custom') {
      startTransition(async () => {
        const data = await fetchFinanceReport('custom', startDateInput, endDateInput);
        setReport(data);
      });
      return;
    }
    startTransition(async () => {
      const data = await fetchFinanceReport(period);
      setReport(data);
    });
  };

  const handleCustomApply = () => {
    startTransition(async () => {
      const data = await fetchFinanceReport('custom', startDateInput, endDateInput);
      setReport(data);
    });
  };

  const s = report?.summary;

  // Filter transactions
  const filteredTransactions = (report?.allTransactions || []).filter(tx => {
    if (filterTab === 'completed') return tx.status === 'completed' && !tx.isEarlyReturn && tx.transactionType === 'rental';
    if (filterTab === 'cancelled') return tx.status === 'cancelled';
    if (filterTab === 'early') return tx.isEarlyReturn;
    if (filterTab === 'ecommerce') return tx.transactionType === 'product_sale';
    return true;
  });

  // ============ EXPORT HELPERS (zero-dependency) ============

  const getReportTitle = () => {
    if (!report) return 'Rapor';
    const label = periodLabels[report.period] || 'Rapor';
    const start = new Date(report.startDate).toLocaleDateString('tr-TR');
    const end = new Date(report.endDate).toLocaleDateString('tr-TR');
    return `Example ${label} (${start} - ${end})`;
  };

  const fmtPayment = (t: string) =>
    t === 'kredi_karti' ? 'Kredi Kartı' : t === 'nakit' ? 'Nakit' : t === 'havale' ? 'Havale/EFT' : t;

  const fmtStatus = (tx: Transaction) =>
    tx.status === 'cancelled' ? 'İptal/İade' : tx.isEarlyReturn ? `Erken Teslim (${tx.earlyReturnDays}g)` : 'Tamamlandı';

  const fmtD = (d: string | null) => d ? new Date(d).toLocaleDateString('tr-TR') : '';

  const fmtType = (tx: Transaction) =>
    tx.transactionType === 'product_sale' ? '🛒 E-Ticaret' : '🚗 Kiralama';

  // CSV escape helper
  const csvCell = (v: string | number) => {
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const handleExportExcel = useCallback(() => {
    if (!report) return;
    const title = getReportTitle();
    const sm = report.summary;

    const headers = ['İşlem Türü','Sipariş No','Müşteri','E-posta','Araç/Ürün','Ödeme Türü','Teslim Alım','Teslim Edim','Süre/Adet','Birim Fiyat','Toplam Tutar','İade Tutarı','Durum'];

    const lines: string[] = [];
    lines.push(csvCell(title));
    lines.push(`Brüt Gelir: ${sm.grossRevenue} TL (Kiralama: ${sm.rentalGross} TL | E-Ticaret: ${sm.ecommerceGross} TL)`);
    lines.push(`İptal: ${sm.cancelledAmount} TL (Kiralama: ${sm.rentalCancelled} TL | E-Ticaret: ${sm.ecommerceCancelled} TL),Net Gelir: ${sm.netRevenue} TL`);
    lines.push('');
    lines.push(headers.map(csvCell).join(','));

    for (const tx of filteredTransactions) {
      lines.push([
        tx.transactionType === 'product_sale' ? 'E-Ticaret' : 'Kiralama',
        tx.documentId || `#${tx.id}`,
        tx.customerName,
        tx.customerEmail,
        tx.car,
        fmtPayment(tx.paymentType),
        tx.startDate ? fmtD(tx.startDate) : '—',
        tx.endDate ? fmtD(tx.endDate) : '—',
        tx.transactionType === 'product_sale' ? `${tx.days} adet` : `${tx.days} gün`,
        tx.pricePerDay,
        tx.total,
        tx.status === 'cancelled' ? tx.total : tx.refundAmount || 0,
        fmtStatus(tx),
      ].map(csvCell).join(','));
    }

    const bom = '\uFEFF';
    const blob = new Blob([bom + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `example_${report.period}_rapor.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [report, filteredTransactions]);

  const handleExportPDF = useCallback(() => {
    if (!report) return;
    const title = getReportTitle();
    const sm = report.summary;

    const tableRows = filteredTransactions.map(tx => `
      <tr>
        <td>${fmtType(tx)}</td>
        <td>${tx.documentId || '#' + tx.id}</td>
        <td>${tx.customerName}</td>
        <td>${tx.car}</td>
        <td>${fmtPayment(tx.paymentType)}</td>
        <td>${tx.startDate ? fmtD(tx.startDate) : '—'}</td>
        <td>${tx.endDate ? fmtD(tx.endDate) : '—'}</td>
        <td style="text-align:center">${tx.transactionType === 'product_sale' ? tx.days + ' ad.' : tx.days + 'g'}</td>
        <td style="text-align:right">${tx.total} TL</td>
        <td style="text-align:right">${tx.status === 'cancelled' ? tx.total + ' TL' : tx.refundAmount ? tx.refundAmount + ' TL' : '-'}</td>
        <td>${fmtStatus(tx)}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
      <style>
        @page { size: landscape; margin: 10mm; }
        body { font-family: Arial, sans-serif; font-size: 10px; color: #222; }
        h1 { font-size: 18px; margin: 0 0 4px; }
        .sub { font-size: 11px; color: #666; margin-bottom: 10px; }
        .summary { display: flex; gap: 24px; margin-bottom: 6px; font-size: 11px; }
        .breakdown { font-size: 9px; color: #888; margin-bottom: 12px; }
        .summary b { color: #ff5a00; }
        table { width: 100%; border-collapse: collapse; font-size: 9px; }
        th { background: #ff5a00; color: #fff; padding: 5px 4px; text-align: left; font-weight: bold; }
        td { padding: 4px; border-bottom: 1px solid #ddd; }
        tr:nth-child(even) { background: #f9f9f9; }
      </style>
    </head><body>
      <h1>Example</h1>
      <div class="sub">${title}</div>
      <div class="summary">
        <span>Brüt Gelir: <b>${sm.grossRevenue} TL</b></span>
        <span>İptal: <b>${sm.cancelledAmount} TL</b></span>
        <span>Net Gelir: <b>${sm.netRevenue} TL</b></span>
        <span>İşlem: <b>${sm.transactionCount}</b></span>
      </div>
      <div class="breakdown">
        Kiralama: ${sm.rentalGross} TL (${sm.rentalCount} işlem) | E-Ticaret: ${sm.ecommerceGross} TL (${sm.ecommerceCount} işlem) | Erken Teslim İade: ${sm.totalEarlyReturnRefund} TL
      </div>
      <table>
        <thead><tr>
          <th>Tür</th><th>#</th><th>Müşteri</th><th>Araç/Ürün</th><th>Ödeme</th><th>Teslim Alım</th><th>Teslim Edim</th><th>Süre</th><th>Tutar</th><th>İade</th><th>Durum</th>
        </tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    </body></html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => { printWindow.print(); };
    }
  }, [report, filteredTransactions]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">💰 Muhasebe & Raporlar</h1>
          <p className="text-gray-500 text-sm mt-1">Finansal metrikler, detaylı işlem dökümü ve gelir raporları</p>
        </div>

        {report && (
          <div className="text-xs text-gray-500 bg-white/[0.03] border border-white/5 rounded-xl px-4 py-2">
            <span className="text-gray-400">Dönem:</span>{' '}
            {mounted ? (
              `${new Date(report.startDate).toLocaleDateString('tr-TR')} — ${new Date(report.endDate).toLocaleDateString('tr-TR')}`
            ) : (
              '...'
            )}
          </div>
        )}
      </div>

      {/* Period Filter + Export Buttons */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex gap-2 flex-wrap">
          {periods.map((p) => (
            <button
              key={p.key}
              onClick={() => handlePeriodChange(p.key)}
              disabled={isPending}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                activePeriod === p.key
                  ? 'bg-[#ff5a00]/10 text-[#ff5a00] border-[#ff5a00]/30 shadow-[0_0_15px_rgba(255,90,0,0.15)]'
                  : 'bg-white/[0.03] text-gray-400 border-white/10 hover:bg-white/[0.06] hover:text-white'
              } disabled:opacity-50`}
            >
              <span className="mr-1.5">{p.icon}</span>
              {p.label}
            </button>
          ))}
        </div>

        {report && !isPending && (
          <div className="flex gap-2">
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 hover:border-green-500/30 transition-all"
            >
              📊 Excel İndir
            </button>
            <button
              onClick={handleExportPDF}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/30 transition-all"
            >
              📄 PDF İndir
            </button>
          </div>
        )}
      </div>

      {/* Özel Tarih Aralığı Paneli */}
      {activePeriod === 'custom' && (
        <div className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl flex flex-wrap items-end gap-4 max-w-xl shadow-[0_0_25px_rgba(0,0,0,0.2)]">
          <div className="flex-1 min-w-[140px]">
            <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block mb-1.5">Başlangıç Tarihi</label>
            <input
              type="date"
              value={startDateInput}
              onChange={e => setStartDateInput(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:border-[#ff5a00]/40 outline-none transition-all"
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block mb-1.5">Bitiş Tarihi</label>
            <input
              type="date"
              value={endDateInput}
              onChange={e => setEndDateInput(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:border-[#ff5a00]/40 outline-none transition-all"
            />
          </div>
          <button
            onClick={handleCustomApply}
            disabled={isPending}
            className="px-5 py-2.5 bg-[#ff5a00] hover:bg-[#ff5a00]/90 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5"
          >
            {isPending ? (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              '⚡ Filtrele'
            )}
          </button>
        </div>
      )}

      {/* Loading State */}
      {isPending && (
        <div className="text-center py-8">
          <div className="inline-flex items-center gap-3 text-gray-400">
            <div className="w-5 h-5 border-2 border-[#ff5a00]/30 border-t-[#ff5a00] rounded-full animate-spin" />
            Rapor yükleniyor...
          </div>
        </div>
      )}

      {/* KPI Cards */}
      {s && !isPending && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Brüt Gelir */}
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 group hover:border-green-500/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Brüt Gelir</span>
              <span className="text-lg">💵</span>
            </div>
            <p className="text-2xl font-black text-green-400">{formatCurrency(s.grossRevenue)}</p>
            <p className="text-[10px] text-gray-600 mt-1">
              🚗 {formatCurrency(s.rentalGross || 0)} Kiralama • 🛒 {formatCurrency(s.ecommerceGross || 0)} E-Ticaret
            </p>
          </div>

          {/* İptal / İade */}
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 group hover:border-red-500/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">İptal / İade</span>
              <span className="text-lg">🚫</span>
            </div>
            <p className="text-2xl font-black text-red-400">{formatCurrency(s.cancelledAmount)}</p>
            <p className="text-[10px] text-gray-600 mt-1">
              🚗 {formatCurrency(s.rentalCancelled || 0)} • 🛒 {formatCurrency(s.ecommerceCancelled || 0)} • {s.cancelledCount} iptal
            </p>
          </div>

          {/* Net Gelir */}
          <div className="bg-white/[0.03] border border-[#ff5a00]/20 rounded-2xl p-5 group hover:border-[#ff5a00]/40 transition-all shadow-[0_0_20px_rgba(255,90,0,0.05)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] text-[#ff5a00] font-semibold uppercase tracking-wider">Net Gelir</span>
              <span className="text-lg">🏦</span>
            </div>
            <p className="text-2xl font-black text-[#ff5a00]">{formatCurrency(s.netRevenue)}</p>
            <p className="text-[10px] text-gray-600 mt-1">Brüt − İptal − İade</p>
          </div>

          {/* Erken Teslim */}
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 group hover:border-yellow-500/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Erken Teslim</span>
              <span className="text-lg">⏰</span>
            </div>
            <p className="text-2xl font-black text-yellow-400">{s.earlyReturnCount || 0}</p>
            <p className="text-[10px] text-gray-600 mt-1">{formatCurrency(s.totalEarlyReturnRefund || 0)} iade tutarı</p>
          </div>

          {/* Aktif Projeksiyonu */}
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 group hover:border-blue-500/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Aktif Tahmini</span>
              <span className="text-lg">📈</span>
            </div>
            <p className="text-2xl font-black text-blue-400">{formatCurrency(s.projectedRevenue)}</p>
            <p className="text-[10px] text-gray-600 mt-1">{s.activeRentalCount} devam eden</p>
          </div>
        </div>
      )}

      {/* Breakdowns */}
      {report && !isPending && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Araç Bazlı Gelir */}
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5">
              <h3 className="text-sm font-bold flex items-center gap-2">
                🚗 Araç Bazlı Gelir Dağılımı
              </h3>
            </div>
            <div className="divide-y divide-white/5">
              {report.carBreakdown.length > 0 ? (
                report.carBreakdown.map((car, i) => {
                  const maxRevenue = report.carBreakdown[0]?.revenue || 1;
                  const pct = (car.revenue / maxRevenue) * 100;
                  return (
                    <div key={i} className="px-5 py-3 flex items-center gap-4 hover:bg-white/[0.02] transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{car.brand} {car.model}</p>
                        <p className="text-[10px] text-gray-500">{car.count} kiralama</p>
                      </div>
                      <div className="w-32 h-1.5 rounded-full bg-white/5 overflow-hidden hidden sm:block">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#ff5a00] to-[#ff7d00]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-sm font-bold text-green-400 whitespace-nowrap">{formatCurrency(car.revenue)}</p>
                    </div>
                  );
                })
              ) : (
                <div className="px-5 py-8 text-center text-gray-600 text-sm">Bu dönemde veri yok.</div>
              )}
            </div>
          </div>

          {/* Ofis Bazlı Gelir */}
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5">
              <h3 className="text-sm font-bold flex items-center gap-2">
                🏢 Ofis Bazlı Gelir Dağılımı
              </h3>
            </div>
            <div className="divide-y divide-white/5">
              {report.officeBreakdown.length > 0 ? (
                report.officeBreakdown.map((office, i) => {
                  const maxRevenue = report.officeBreakdown[0]?.revenue || 1;
                  const pct = (office.revenue / maxRevenue) * 100;
                  return (
                    <div key={i} className="px-5 py-3 flex items-center gap-4 hover:bg-white/[0.02] transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{office.name}</p>
                        <p className="text-[10px] text-gray-500">{office.count} kiralama</p>
                      </div>
                      <div className="w-32 h-1.5 rounded-full bg-white/5 overflow-hidden hidden sm:block">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-sm font-bold text-green-400 whitespace-nowrap">{formatCurrency(office.revenue)}</p>
                    </div>
                  );
                })
              ) : (
                <div className="px-5 py-8 text-center text-gray-600 text-sm">Bu dönemde veri yok.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============ DETAYLI İŞLEM DÖKÜMÜ ============ */}
      {report && !isPending && (report.allTransactions || []).length > 0 && (
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm font-bold flex items-center gap-2">
              📝 Detaylı İşlem Dökümü
              <span className="text-[10px] text-gray-500 font-normal">({filteredTransactions.length} kayıt)</span>
            </h3>

            {/* Filter tabs */}
            <div className="flex gap-1">
              {([
                { key: 'all' as FilterTab, label: 'Tümü', count: report.allTransactions.length },
                { key: 'completed' as FilterTab, label: 'Tamamlanan', count: report.allTransactions.filter(t => t.status === 'completed' && !t.isEarlyReturn && t.transactionType === 'rental').length },
                { key: 'cancelled' as FilterTab, label: 'İptal', count: report.allTransactions.filter(t => t.status === 'cancelled').length },
                { key: 'early' as FilterTab, label: 'Erken Teslim', count: report.allTransactions.filter(t => t.isEarlyReturn).length },
                { key: 'ecommerce' as FilterTab, label: '🛒 E-Ticaret', count: report.allTransactions.filter(t => t.transactionType === 'product_sale').length },
              ]).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilterTab(tab.key)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all border ${
                    filterTab === tab.key
                      ? 'bg-[#ff5a00]/10 text-[#ff5a00] border-[#ff5a00]/20'
                      : 'bg-white/[0.03] text-gray-500 border-white/5 hover:text-white'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1000px]">
              <thead>
                <tr className="border-b border-white/5 text-gray-500 text-[10px] uppercase tracking-wider">
                  <th className="text-left p-3 pl-5">İşlem Türü</th>
                  <th className="text-left p-3">Sipariş No</th>
                  <th className="text-left p-3">Müşteri</th>
                  <th className="text-left p-3">Araç / Ürün</th>
                  <th className="text-left p-3">Ödeme Türü</th>
                  <th className="text-left p-3">Teslim Alım</th>
                  <th className="text-left p-3">Teslim Edim</th>
                  <th className="text-center p-3">Süre / Adet</th>
                  <th className="text-right p-3">Tutar</th>
                  <th className="text-right p-3">İade</th>
                  <th className="text-center p-3 pr-5">Durum</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((tx, idx) => (
                  <tr
                    key={`${tx.id}-${idx}`}
                    className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors ${
                      tx.status === 'cancelled' ? 'bg-red-500/[0.02]' : ''
                    }`}
                  >
                    {/* İşlem Türü */}
                    <td className="p-3 pl-5">
                      {tx.transactionType === 'product_sale' ? (
                        <span className="inline-flex items-center gap-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          🛒 E-Ticaret
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          🚗 Kiralama
                        </span>
                      )}
                    </td>

                    {/* Sipariş No */}
                    <td className="p-3">
                      <span className="font-mono text-xs text-gray-400">{tx.transactionType === 'product_sale' ? tx.documentId : `#${tx.id}`}</span>
                    </td>

                    {/* Müşteri */}
                    <td className="p-3">
                      <p className="text-xs font-semibold text-white truncate max-w-[140px]">{tx.customerName}</p>
                      {tx.customerEmail && (
                        <p className="text-[10px] text-gray-600 truncate max-w-[140px]">{tx.customerEmail}</p>
                      )}
                    </td>

                    {/* Araç */}
                    <td className="p-3">
                      <span className="text-xs text-gray-300 font-medium">{tx.car}</span>
                    </td>

                    {/* Ödeme Türü */}
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 bg-white/5 text-gray-400 px-2 py-0.5 rounded text-[10px] font-medium border border-white/5">
                        {tx.paymentType === 'kredi_karti' ? '💳 Kredi Kartı' :
                         tx.paymentType === 'nakit' ? '💵 Nakit' :
                         tx.paymentType === 'havale' ? '🏦 Havale/EFT' :
                         tx.paymentType}
                      </span>
                    </td>

                    {/* Teslim Alım */}
                    <td className="p-3 text-xs text-gray-400 whitespace-nowrap">
                      {tx.transactionType === 'product_sale' ? (
                        <span className="text-gray-600">—</span>
                      ) : (
                        formatShortDate(tx.startDate)
                      )}
                    </td>

                    {/* Teslim Edim */}
                    <td className="p-3 text-xs text-gray-400 whitespace-nowrap">
                      {tx.transactionType === 'product_sale' ? (
                        <span className="text-gray-600">—</span>
                      ) : (
                        <>
                          {formatShortDate(tx.endDate)}
                          {tx.requestedEndDate && tx.isEarlyReturn && (
                            <p className="text-[9px] text-yellow-500/70 line-through">
                              Plan: {formatShortDate(tx.requestedEndDate)}
                            </p>
                          )}
                        </>
                      )}
                    </td>

                    {/* Süre / Adet */}
                    <td className="p-3 text-center">
                      <span className="text-xs text-gray-300 font-medium">
                        {tx.transactionType === 'product_sale' ? `${tx.days} adet` : `${tx.days}g`}
                      </span>
                    </td>

                    {/* Tutar */}
                    <td className="p-3 text-right">
                      {tx.isEarlyReturn ? (
                        <>
                          <span className="text-xs font-bold text-green-400">
                            {formatCurrency(tx.total)}
                          </span>
                          <p className="text-[9px] text-gray-500 line-through">
                            Plan: {formatCurrency((tx.days + tx.earlyReturnDays) * tx.pricePerDay)}
                          </p>
                        </>
                      ) : (
                        <span className={`text-xs font-bold ${tx.status === 'cancelled' ? 'text-red-400 line-through' : 'text-green-400'}`}>
                          {formatCurrency(tx.total)}
                        </span>
                      )}
                      <p className="text-[9px] text-gray-600">{formatCurrency(tx.pricePerDay)}{tx.transactionType === 'product_sale' ? '/adet' : '/gün'}</p>
                    </td>

                    {/* İade Tutarı */}
                    <td className="p-3 text-right">
                      {tx.status === 'cancelled' ? (
                        <span className="text-xs font-bold text-red-400">{formatCurrency(tx.total)}</span>
                      ) : tx.isEarlyReturn && tx.refundAmount > 0 ? (
                        <>
                          <span className="text-xs font-bold text-yellow-400">-{formatCurrency(tx.refundAmount)}</span>
                          <p className="text-[9px] text-yellow-500/50">Erken İade İnd.</p>
                        </>
                      ) : (
                        <span className="text-gray-700">—</span>
                      )}
                    </td>

                    {/* Durum */}
                    <td className="p-3 pr-5 text-center">
                      <StatusBadge tx={tx} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredTransactions.length === 0 && (
            <div className="px-5 py-8 text-center text-gray-600 text-sm">
              Bu filtrede görüntülenecek işlem yok.
            </div>
          )}
        </div>
      )}

      {/* No Data State */}
      {!report && !isPending && (
        <div className="text-center py-16">
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl inline-flex flex-col items-center p-12">
            <div className="text-5xl mb-4 opacity-50">📊</div>
            <h3 className="text-lg font-bold text-gray-400 mb-2">Rapor Yüklenemedi</h3>
            <p className="text-sm text-gray-600">Sunucuya bağlanılamadı. Lütfen tekrar deneyin.</p>
          </div>
        </div>
      )}
    </div>
  );
}
