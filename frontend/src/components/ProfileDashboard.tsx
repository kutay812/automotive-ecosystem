'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { extendRental, returnNoticeRental } from '@/app/actions/rental';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://127.0.0.1:1337';

function toDateStr(d: string | Date) {
  return new Date(d).toISOString().split('T')[0];
}
function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}

// ========== STATUS BADGE ==========
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    bekliyor:           { label: 'Onay Bekliyor',            cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    aktif:              { label: 'Aktif',                     cls: 'bg-green-50 text-green-700 border-green-200' },
    uzatma_talep:       { label: 'Uzatma Bekleniyor',         cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    erken_teslim_talep: { label: 'Erken Teslim Talebi',       cls: 'bg-purple-50 text-purple-700 border-purple-200' },
    iade_bildirildi:    { label: 'İade Bildirimi',            cls: 'bg-orange-50 text-orange-700 border-orange-200' },
    bitti:              { label: 'Tamamlandı',                cls: 'bg-surface-variant text-on-surface-variant border-outline-variant' },
    iptal:              { label: 'İptal Edildi',              cls: 'bg-error-container text-on-error-container border-error/20' },
    completed:          { label: 'Tamamlandı',                cls: 'bg-surface-variant text-on-surface-variant border-outline-variant' },
    cancelled:          { label: 'İptal',                     cls: 'bg-error-container text-on-error-container border-error/20' },
  };
  const cfg = map[status] || { label: status, cls: 'bg-surface text-on-surface border-outline-variant' };
  return <span className={`px-3 py-1 rounded-full text-caption font-semibold border ${cfg.cls}`}>{cfg.label}</span>;
}

// ========== TABS ==========
const TABS = [
  { id: 'info', label: 'Kişisel Bilgiler', icon: 'person' },
  { id: 'rentals', label: 'Kiralamalar', icon: 'directions_car' },
  { id: 'orders', label: 'Siparişler', icon: 'shopping_cart' },
] as const;
type TabId = typeof TABS[number]['id'];

export default function ProfileDashboard({ data }: { data: any }) {
  const [activeTab, setActiveTab] = useState<TabId>('info');
  const router = useRouter();

  const { user, stats, rentals, orders } = data;

  // ===== PERSONAL INFO EDIT =====
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    username: user.username || '',
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    phoneNumber: user.phoneNumber || '',
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const handleSaveProfile = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`${STRAPI_URL}/api/user-extension/update-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${document.cookie.split('jwt=')[1]?.split(';')[0] || ''}` },
        body: JSON.stringify(form),
        credentials: 'include',
      });
      if (res.ok) {
        setMsg({ type: 'ok', text: 'Bilgileriniz güncellendi.' });
        setEditing(false);
        router.refresh();
      } else {
        const d = await res.json().catch(() => ({}));
        setMsg({ type: 'err', text: d?.error?.message || 'Güncelleme başarısız.' });
      }
    } catch {
      setMsg({ type: 'err', text: 'Sunucuya bağlanılamadı.' });
    }
    setSaving(false);
  };

  // ===== RENTAL ACTIONS =====
  const [extendingId, setExtendingId] = useState<string | null>(null);
  const [extendDate, setExtendDate] = useState('');
  const [earlyReturnId, setEarlyReturnId] = useState<string | null>(null);
  const [earlyReturnDate, setEarlyReturnDate] = useState('');

  const handleExtend = async (rentalId: string, currentEndDate: string) => {
    if (!extendDate) { alert('Lütfen uzatmak istediğiniz tarihi seçin.'); return; }
    if (extendDate <= currentEndDate) { alert('Uzatma tarihi mevcut teslim tarihinden daha ileri olmalıdır.'); return; }
    const res = await extendRental(rentalId, extendDate);
    if (res.error) alert(res.error);
    else { alert('Uzatma talebiniz iletildi.'); setExtendingId(null); setExtendDate(''); router.refresh(); }
  };

  const handleEarlyReturn = async (rentalId: string, startDate: string) => {
    if (!earlyReturnDate) { alert('Lütfen erken teslim tarihini seçin.'); return; }
    if (earlyReturnDate <= startDate) { alert('Erken teslim tarihi alış tarihinden sonra olmalıdır.'); return; }
    const res = await returnNoticeRental(rentalId, earlyReturnDate, 'erken_teslim_talep');
    if (res.error) alert(res.error);
    else { alert('Erken teslim talebiniz iletildi.'); setEarlyReturnId(null); setEarlyReturnDate(''); router.refresh(); }
  };

  const handleReturn = async (rentalId: string) => {
    if (confirm('Aracı teslim edeceğinizi bildirmek istediğinize emin misiniz?')) {
      const res = await returnNoticeRental(rentalId, undefined);
      if (res.error) alert(res.error);
      else { alert('İade bildiriminiz kaydedildi.'); router.refresh(); }
    }
  };

  // ===== RENTAL GROUPS =====
  const activeRentals = rentals.filter((r: any) => ['aktif', 'uzatma_talep', 'iade_bildirildi', 'erken_teslim_talep'].includes(r.rentalStatus));
  const pendingRentals = rentals.filter((r: any) => r.rentalStatus === 'bekliyor');
  const pastRentals = rentals.filter((r: any) => r.rentalStatus === 'bitti' || r.rentalStatus === 'iptal');

  const memberSince = user.createdAt ? new Date(user.createdAt).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' }) : '';

  return (
    <div className="space-y-8 max-w-[1280px] mx-auto px-6 pt-10">
      {/* ===== USER HEADER CARD ===== */}
      <div className="card rounded-2xl p-8 relative">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 relative z-10">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center text-display-lg-mobile font-black shadow-sm">
            {(user.firstName?.[0] || user.email?.[0] || 'U').toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-display-lg-mobile font-black text-primary truncate">{user.firstName} {user.lastName}</h1>
            <p className="text-on-surface-variant text-body-md mt-1">{user.email}</p>
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <span className="px-3 py-1 rounded-full text-caption font-semibold border bg-primary-container text-on-primary-container border-outline-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">{user.provider === 'google' ? 'link' : 'mail'}</span>
                {user.provider === 'google' ? 'Google' : 'E-posta'}
              </span>
              {memberSince && (
                <span className="text-caption text-on-surface-variant">Üyelik: {memberSince}</span>
              )}
            </div>
          </div>
          {/* Stats Mini */}
          <div className="flex gap-3 flex-wrap">
            {[
              { label: 'Kiralama', value: stats.totalRentals, icon: 'directions_car' },
              { label: 'Aktif', value: stats.activeRentals, icon: 'check_circle' },
              { label: 'Sipariş', value: stats.totalOrders, icon: 'shopping_bag' },
            ].map(s => (
              <div key={s.label} className="bg-surface-container border border-outline-variant rounded-xl px-4 py-3 text-center min-w-[80px]">
                <div className="text-secondary mb-1"><span className="material-symbols-outlined">{s.icon}</span></div>
                <div className="text-headline-sm font-black text-primary">{s.value}</div>
                <div className="text-caption text-on-surface-variant uppercase tracking-wider font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== TABS ===== */}
      <div className="flex gap-1 border-b border-outline-variant pb-0">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-3 text-label-md font-semibold rounded-t-xl transition-all duration-300 border-b-2 ${
              activeTab === tab.id
                ? 'border-secondary text-secondary bg-secondary-container'
                : 'border-transparent text-on-surface-variant hover:text-primary hover:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===== TAB: KİŞİSEL BİLGİLER ===== */}
      {activeTab === 'info' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="card rounded-2xl p-6 relative">
            <div className="flex items-center justify-between mb-6 border-b border-outline-variant pb-4">
              <h3 className="text-headline-sm text-primary">Hesap Bilgileri</h3>
              {!editing ? (
                <button onClick={() => setEditing(true)} className="text-label-md text-secondary border border-outline-variant bg-surface-container px-4 py-2 rounded-lg hover:bg-surface-variant transition-all duration-300 font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">edit</span> Düzenle
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={handleSaveProfile} disabled={saving} className="text-label-md btn-secondary px-4 py-2 rounded-lg disabled:opacity-50 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">save</span> {saving ? '...' : 'Kaydet'}
                  </button>
                  <button onClick={() => { setEditing(false); setMsg(null); }} className="text-label-md text-on-surface-variant border border-outline-variant px-4 py-2 rounded-lg hover:bg-surface-container transition-colors duration-300">
                    İptal
                  </button>
                </div>
              )}
            </div>

            {msg && (
              <div className={`mb-4 text-caption p-3 rounded-lg border ${msg.type === 'ok' ? 'text-green-700 bg-green-50 border-green-200' : 'text-error bg-error-container border-error/20'}`}>
                {msg.text}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[
                { label: 'Ad', key: 'firstName' },
                { label: 'Soyad', key: 'lastName' },
                { label: 'Kullanıcı Adı', key: 'username' },
                { label: 'Telefon', key: 'phoneNumber' },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-caption text-on-surface-variant mb-1.5 font-medium">{field.label}</label>
                  {editing ? (
                    <input
                      type="text"
                      value={(form as any)[field.key]}
                      onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                      className="w-full rounded-lg bg-surface border-outline-variant"
                    />
                  ) : (
                    <p className="text-primary font-medium text-body-md py-2.5">{(form as any)[field.key] || '—'}</p>
                  )}
                </div>
              ))}
              <div>
                <label className="block text-caption text-on-surface-variant mb-1.5 font-medium">E-posta</label>
                <p className="text-on-surface text-body-md py-2.5">{user.email}</p>
              </div>
              <div>
                <label className="block text-caption text-on-surface-variant mb-1.5 font-medium">Kayıt Yöntemi</label>
                <p className="text-on-surface text-body-md py-2.5 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">{user.provider === 'google' ? 'link' : 'mail'}</span>
                  {user.provider === 'google' ? 'Google' : 'E-posta/Şifre'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== TAB: KİRALAMALAR ===== */}
      {activeTab === 'rentals' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Aktif */}
          <section>
            <h3 className="text-headline-sm text-green-600 mb-4 flex items-center gap-2"><span className="material-symbols-outlined">directions_car</span> Aktif Kiralamalar</h3>
            {activeRentals.length === 0 ? (
              <p className="text-on-surface-variant italic text-body-md">Aktif kiralama yok.</p>
            ) : (
              <div className="grid gap-4">
                {activeRentals.map((r: any) => {
                  const currentEnd = toDateStr(r.endDate);
                  const startD = toDateStr(r.startDate);
                  const minExtend = addDays(currentEnd, 1);
                  const minEarlyReturn = addDays(startD, 1);
                  return (
                    <div key={r.documentId} className="card p-5 rounded-2xl border-l-4 border-l-green-500">
                      <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div>
                          <h4 className="text-headline-sm text-primary">{r.car?.brand} {r.car?.model}</h4>
                          <p className="text-on-surface-variant text-body-md mt-1 flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">location_on</span> {r.pickupOffice} ➔ {r.dropoffOffice}</p>
                          <p className="text-on-surface-variant text-body-md mt-1 flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">calendar_today</span> {new Date(r.startDate).toLocaleDateString('tr-TR')} – {new Date(r.endDate).toLocaleDateString('tr-TR')}</p>
                          {r.requestedEndDate && <p className="text-secondary text-caption mt-1">📅 Talep: {new Date(r.requestedEndDate).toLocaleDateString('tr-TR')}</p>}
                          <div className="mt-3"><StatusBadge status={r.rentalStatus} /></div>
                        </div>
                        <div className="flex flex-col gap-2 min-w-[200px]">
                          {r.rentalStatus === 'aktif' && extendingId !== r.documentId && (
                            <button onClick={() => { setExtendingId(r.documentId); setExtendDate(minExtend); }} className="btn-secondary px-4 py-2 rounded-lg text-label-md flex items-center justify-center gap-1"><span className="material-symbols-outlined text-[18px]">fast_forward</span> Süreyi Uzat</button>
                          )}
                          {extendingId === r.documentId && (
                            <div className="bg-surface-container p-3 rounded-lg border border-outline-variant flex flex-col gap-2">
                              <input type="date" min={minExtend} value={extendDate} onChange={e => setExtendDate(e.target.value)} className="bg-surface border border-outline-variant rounded p-1.5 text-caption text-on-surface" />
                              <div className="flex gap-2">
                                <button onClick={() => handleExtend(r.documentId, currentEnd)} className="btn-secondary px-3 py-1.5 rounded text-caption flex-1">Gönder</button>
                                <button onClick={() => { setExtendingId(null); setExtendDate(''); }} className="bg-surface border border-outline-variant text-on-surface hover:bg-surface-variant px-3 py-1.5 rounded text-caption flex-1">İptal</button>
                              </div>
                            </div>
                          )}
                          {r.rentalStatus === 'aktif' && earlyReturnId !== r.documentId && (
                            <button onClick={() => { setEarlyReturnId(r.documentId); setEarlyReturnDate(minEarlyReturn); }} className="bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 px-4 py-2 rounded-lg text-label-md transition-all duration-300 flex items-center justify-center gap-1"><span className="material-symbols-outlined text-[18px]">fast_rewind</span> Erken Teslim</button>
                          )}
                          {earlyReturnId === r.documentId && (
                            <div className="bg-surface-container p-3 rounded-lg border border-orange-200 flex flex-col gap-2">
                              <input type="date" min={minEarlyReturn} max={currentEnd} value={earlyReturnDate} onChange={e => setEarlyReturnDate(e.target.value)} className="bg-surface border border-outline-variant rounded p-1.5 text-caption text-on-surface" />
                              <div className="flex gap-2">
                                <button onClick={() => handleEarlyReturn(r.documentId, startD)} className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-3 py-1.5 rounded text-caption flex-1">Onayla</button>
                                <button onClick={() => { setEarlyReturnId(null); setEarlyReturnDate(''); }} className="bg-surface border border-outline-variant text-on-surface hover:bg-surface-variant px-3 py-1.5 rounded text-caption flex-1">İptal</button>
                              </div>
                            </div>
                          )}
                          {r.rentalStatus === 'aktif' && earlyReturnId !== r.documentId && (
                            <button onClick={() => handleReturn(r.documentId)} className="bg-surface hover:bg-surface-variant text-on-surface-variant border border-outline-variant px-4 py-2 rounded-lg text-label-md transition-all duration-300 flex items-center justify-center gap-1"><span className="material-symbols-outlined text-[18px]">assignment_return</span> İade Bildirimi</button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Bekleyen */}
          {pendingRentals.length > 0 && (
            <section>
              <h3 className="text-headline-sm text-yellow-600 mb-4 flex items-center gap-2"><span className="material-symbols-outlined">hourglass_empty</span> Bekleyen</h3>
              <div className="grid gap-3">
                {pendingRentals.map((r: any) => (
                  <div key={r.documentId} className="card p-4 rounded-xl flex justify-between items-center border-l-4 border-l-yellow-400">
                    <div>
                      <span className="font-bold text-primary">{r.car?.brand} {r.car?.model}</span>
                      <span className="text-on-surface-variant text-caption ml-3">{new Date(r.startDate).toLocaleDateString('tr-TR')} – {new Date(r.endDate).toLocaleDateString('tr-TR')}</span>
                    </div>
                    <StatusBadge status={r.rentalStatus} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Geçmiş */}
          {pastRentals.length > 0 && (
            <section>
              <h3 className="text-headline-sm text-on-surface-variant mb-4 flex items-center gap-2"><span className="material-symbols-outlined">history</span> Geçmiş</h3>
              <div className="grid gap-3">
                {pastRentals.map((r: any) => (
                  <div key={r.documentId} className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant flex justify-between items-center hover:bg-surface transition-colors duration-300">
                    <div>
                      <span className="font-semibold text-primary">{r.car?.brand} {r.car?.model}</span>
                      <span className="text-on-surface-variant text-caption ml-3">{new Date(r.startDate).toLocaleDateString('tr-TR')} – {new Date(r.endDate).toLocaleDateString('tr-TR')}</span>
                    </div>
                    <StatusBadge status={r.rentalStatus} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {rentals.length === 0 && <p className="text-on-surface-variant italic text-body-md text-center py-8">Henüz kiralama geçmişiniz bulunmuyor.</p>}
        </div>
      )}

      {/* ===== TAB: SİPARİŞLER ===== */}
      {activeTab === 'orders' && (
        <div className="animate-in fade-in duration-300">
          {orders.length === 0 ? (
            <div className="text-center py-16 card">
              <span className="material-symbols-outlined text-[64px] text-outline mb-4">shopping_bag</span>
              <p className="text-on-surface-variant text-body-md">Henüz sipariş geçmişiniz bulunmuyor.</p>
            </div>
          ) : (
            <div className="card rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-body-md">
                  <thead>
                    <tr className="border-b border-outline-variant bg-surface-container text-left">
                      <th className="px-5 py-4 text-caption text-on-surface-variant font-semibold uppercase tracking-wider">Ürün</th>
                      <th className="px-5 py-4 text-caption text-on-surface-variant font-semibold uppercase tracking-wider">Adet</th>
                      <th className="px-5 py-4 text-caption text-on-surface-variant font-semibold uppercase tracking-wider">Toplam</th>
                      <th className="px-5 py-4 text-caption text-on-surface-variant font-semibold uppercase tracking-wider">Durum</th>
                      <th className="px-5 py-4 text-caption text-on-surface-variant font-semibold uppercase tracking-wider">Tarih</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o: any) => (
                      <tr key={o.id} className="border-b border-outline-variant hover:bg-surface-container transition-colors duration-300">
                        <td className="px-5 py-4">
                          <div className="font-medium text-primary">{o.itemTitle}</div>
                          {o.itemPlatform && <span className="text-[10px] text-on-surface-variant uppercase font-medium">{o.itemPlatform}</span>}
                        </td>
                        <td className="px-5 py-4 text-on-surface-variant">{o.quantity}</td>
                        <td className="px-5 py-4 text-primary font-semibold">₺{parseFloat(o.total || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                        <td className="px-5 py-4"><StatusBadge status={o.status} /></td>
                        <td className="px-5 py-4 text-on-surface-variant text-caption">{new Date(o.createdAt).toLocaleDateString('tr-TR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
