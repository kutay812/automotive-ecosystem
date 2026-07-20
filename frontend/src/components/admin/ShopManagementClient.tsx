'use client';

import { useState, useTransition } from 'react';
import { createShopItem, updateShopItem, deleteShopItem, syncShopItems, updateShopSettings, fetchShopItems, fetchShopSettings } from '@/app/actions/admin';
import { PART_CATEGORIES, VEHICLE_BRANDS } from '@/lib/shopCategories';

interface ShopItem {
  id: number;
  title: string;
  price: number;
  image_url: string;
  buy_link: string;
  platform: string;
  category: string;
  sub_category?: string;
  vehicle_brand?: string;
  vehicle_model?: string;
  marketplace_id: string;
  is_active: boolean;
}

interface MarketplaceSetting {
  id?: number;
  platform: string;
  api_key: string;
  api_secret: string;
  seller_id: string;
  store_url: string;
  is_enabled: boolean;
}

const PLATFORMS = [
  { key: 'trendyol', label: 'Trendyol', color: '#F27A1A', icon: '🟠' },
  { key: 'hepsiburada', label: 'Hepsiburada', color: '#FF6000', icon: '🟡' },
  { key: 'n11', label: 'N11', color: '#7B2D8E', icon: '🟣' },
];

type Tab = 'products' | 'settings';

export default function ShopManagementClient({ initialItems, initialSettings }: { initialItems: ShopItem[]; initialSettings: MarketplaceSetting[] }) {
  const [items, setItems] = useState<ShopItem[]>(initialItems);
  const [settings, setSettings] = useState<MarketplaceSetting[]>(initialSettings);
  const [activeTab, setActiveTab] = useState<Tab>('products');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<ShopItem | null>(null);
  const [syncMsg, setSyncMsg] = useState('');
  const [isPending, startTransition] = useTransition();

  // Form state
  const [form, setForm] = useState({
    title: '',
    price: '',
    image_url: '',
    buy_link: '',
    platform: 'trendyol',
    category: '',
    sub_category: '',
    vehicle_brand: '',
    vehicle_model: '',
    marketplace_id: ''
  });

  const resetForm = () => {
    setForm({
      title: '',
      price: '',
      image_url: '',
      buy_link: '',
      platform: 'trendyol',
      category: '',
      sub_category: '',
      vehicle_brand: '',
      vehicle_model: '',
      marketplace_id: ''
    });
    setEditItem(null);
    setShowForm(false);
  };

  const openEdit = (item: ShopItem) => {
    setForm({
      title: item.title,
      price: String(item.price),
      image_url: item.image_url,
      buy_link: item.buy_link,
      platform: item.platform,
      category: item.category || '',
      sub_category: item.sub_category || '',
      vehicle_brand: item.vehicle_brand || '',
      vehicle_model: item.vehicle_model || '',
      marketplace_id: item.marketplace_id,
    });
    setEditItem(item);
    setShowForm(true);
  };

  const handleSave = () => {
    startTransition(async () => {
      const payload = { ...form, price: parseFloat(form.price) || 0 };
      if (editItem) {
        await updateShopItem(editItem.id, payload);
      } else {
        await createShopItem(payload);
      }
      const fresh = await fetchShopItems();
      setItems(fresh);
      resetForm();
    });
  };

  const handleDelete = (id: number) => {
    if (!confirm('Bu ürünü silmek istediğinizden emin misiniz?')) return;
    startTransition(async () => {
      await deleteShopItem(id);
      const fresh = await fetchShopItems();
      setItems(fresh);
    });
  };

  const handleToggle = (item: ShopItem) => {
    startTransition(async () => {
      await updateShopItem(item.id, { is_active: !item.is_active });
      const fresh = await fetchShopItems();
      setItems(fresh);
    });
  };

  const handleSync = () => {
    startTransition(async () => {
      const result = await syncShopItems();
      setSyncMsg(result.message || 'Senkronizasyon tamamlandı.');
      const fresh = await fetchShopItems();
      setItems(fresh);
    });
  };

  const handleSettingSave = (platform: string, data: Partial<MarketplaceSetting>) => {
    startTransition(async () => {
      await updateShopSettings({ platform, ...data });
      const fresh = await fetchShopSettings();
      setSettings(fresh);
    });
  };

  const getSetting = (platform: string): MarketplaceSetting => {
    return settings.find(s => s.platform === platform) || { platform, api_key: '', api_secret: '', seller_id: '', store_url: '', is_enabled: false };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">🛒 Alışveriş Yönetimi</h1>
          <p className="text-gray-500 text-sm mt-1">Pazaryeri ürünlerini yönetin ve mağaza vitrinini düzenleyin</p>
        </div>
        <div className="flex gap-2">
          <span className="text-xs text-gray-500 bg-white/[0.03] border border-white/5 rounded-xl px-4 py-2">
            {items.length} ürün • {items.filter(i => i.is_active).length} aktif
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('products')}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all border ${activeTab === 'products' ? 'bg-[#ff5a00]/10 text-[#ff5a00] border-[#ff5a00]/30' : 'bg-white/[0.03] text-gray-400 border-white/10 hover:text-white'}`}
        >📦 Ürünler</button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all border ${activeTab === 'settings' ? 'bg-[#ff5a00]/10 text-[#ff5a00] border-[#ff5a00]/30' : 'bg-white/[0.03] text-gray-400 border-white/10 hover:text-white'}`}
        >⚙️ Pazaryeri Ayarları</button>
      </div>

      {/* Sync Message */}
      {syncMsg && (
        <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm px-4 py-3 rounded-xl flex justify-between items-center">
          <span>{syncMsg}</span>
          <button onClick={() => setSyncMsg('')} className="text-blue-300 hover:text-white">✕</button>
        </div>
      )}

      {/* =================== PRODUCTS TAB =================== */}
      {activeTab === 'products' && (
        <>
          {/* Action Buttons */}
          <div className="flex gap-3 flex-wrap">
            <button onClick={() => { resetForm(); setShowForm(true); }} className="px-4 py-2.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded-xl text-xs font-bold hover:bg-green-500/20 transition-all">
              ➕ Ürün Ekle
            </button>
            <button onClick={handleSync} disabled={isPending} className="px-4 py-2.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl text-xs font-bold hover:bg-blue-500/20 transition-all disabled:opacity-50">
              🔄 Senkronize Et
            </button>
          </div>

          {/* Add/Edit Form */}
          {showForm && (
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold">{editItem ? '✏️ Ürün Düzenle' : '➕ Yeni Ürün Ekle'}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ürün Adı *" className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-[#ff5a00]/40 outline-none" />
                <input value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="Fiyat (TL)" type="number" className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-[#ff5a00]/40 outline-none" />
                <select value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })} className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-[#ff5a00]/40 outline-none">
                  {PLATFORMS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                </select>

                {/* Kategori Seçici */}
                <select 
                  value={form.category} 
                  onChange={e => {
                    const cat = e.target.value;
                    setForm({ ...form, category: cat, sub_category: '' });
                  }} 
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-[#ff5a00]/40 outline-none"
                >
                  <option value="">Kategori Seçin *</option>
                  {PART_CATEGORIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>

                {/* Alt Kategori Seçici */}
                <select 
                  value={form.sub_category} 
                  onChange={e => setForm({ ...form, sub_category: e.target.value })} 
                  disabled={!form.category}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-[#ff5a00]/40 outline-none disabled:opacity-40"
                >
                  <option value="">Alt Kategori Seçin</option>
                  {form.category && PART_CATEGORIES.find(c => c.name === form.category)?.subcategories.map(sc => (
                    <option key={sc} value={sc}>{sc}</option>
                  ))}
                </select>

                {/* Araç Markası Seçici */}
                <select 
                  value={form.vehicle_brand} 
                  onChange={e => {
                    const brand = e.target.value;
                    setForm({ ...form, vehicle_brand: brand, vehicle_model: '' });
                  }} 
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-[#ff5a00]/40 outline-none"
                >
                  <option value="">Araç Markası Seçin</option>
                  {VEHICLE_BRANDS.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
                </select>

                {/* Araç Modeli Seçici */}
                <select 
                  value={form.vehicle_model} 
                  onChange={e => setForm({ ...form, vehicle_model: e.target.value })} 
                  disabled={!form.vehicle_brand}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-[#ff5a00]/40 outline-none disabled:opacity-40"
                >
                  <option value="">Araç Modeli Seçin</option>
                  {form.vehicle_brand && VEHICLE_BRANDS.find(b => b.name === form.vehicle_brand)?.models.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>

                <input value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} placeholder="Görsel URL" className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-[#ff5a00]/40 outline-none" />
                <input value={form.buy_link} onChange={e => setForm({ ...form, buy_link: e.target.value })} placeholder="Satın Al Linki" className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-[#ff5a00]/40 outline-none" />
              </div>
              <div className="flex gap-3">
                <button onClick={handleSave} disabled={isPending || !form.title || !form.category} className="px-5 py-2.5 bg-[#ff5a00] text-white rounded-xl text-xs font-bold hover:bg-[#ff7d00] transition-all disabled:opacity-50">
                  {isPending ? 'Kaydediliyor...' : editItem ? 'Güncelle' : 'Ekle'}
                </button>
                <button onClick={resetForm} className="px-5 py-2.5 bg-white/5 text-gray-400 rounded-xl text-xs font-bold hover:bg-white/10 transition-all">İptal</button>
              </div>
            </div>
          )}

          {/* Products Table */}
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]">
                <thead>
                  <tr className="border-b border-white/5 text-gray-500 text-[10px] uppercase tracking-wider">
                    <th className="text-left p-3 pl-5">Görsel</th>
                    <th className="text-left p-3">Ürün Adı</th>
                    <th className="text-left p-3">Platform</th>
                    <th className="text-left p-3">Kategori</th>
                    <th className="text-left p-3">Araç Uyum</th>
                    <th className="text-right p-3">Fiyat</th>
                    <th className="text-center p-3">Durum</th>
                    <th className="text-center p-3 pr-5">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="p-3 pl-5">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.title} className="w-12 h-12 rounded-lg object-cover border border-white/10" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center text-gray-600 text-lg">📦</div>
                        )}
                      </td>
                      <td className="p-3">
                        <p className="text-xs font-semibold text-white truncate max-w-[200px]">{item.title}</p>
                        {item.buy_link && <p className="text-[10px] text-gray-600 truncate max-w-[200px]">{item.buy_link}</p>}
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          item.platform === 'trendyol' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                          item.platform === 'hepsiburada' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                          'bg-purple-500/10 text-purple-400 border-purple-500/20'
                        }`}>
                          {PLATFORMS.find(p => p.key === item.platform)?.icon} {PLATFORMS.find(p => p.key === item.platform)?.label || item.platform}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-gray-400">
                        <div className="font-semibold text-white">{item.category || '—'}</div>
                        {item.sub_category && <div className="text-[10px] text-gray-500">{item.sub_category}</div>}
                      </td>
                      <td className="p-3 text-xs text-gray-400">
                        {item.vehicle_brand ? (
                          <>
                            <div className="font-semibold text-white">{item.vehicle_brand}</div>
                            {item.vehicle_model && <div className="text-[10px] text-gray-500">{item.vehicle_model}</div>}
                          </>
                        ) : (
                          <span className="text-gray-600">Tüm Araçlar</span>
                        )}
                      </td>
                      <td className="p-3 text-right text-xs font-bold text-green-400">
                        {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(item.price)}
                      </td>
                      <td className="p-3 text-center">
                        <button onClick={() => handleToggle(item)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${item.is_active ? 'bg-green-500' : 'bg-gray-600'}`}>
                          <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${item.is_active ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                        </button>
                      </td>
                      <td className="p-3 pr-5 text-center">
                        <div className="flex gap-1 justify-center">
                          <button onClick={() => openEdit(item)} className="text-[10px] px-2 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-500/20">✏️</button>
                          <button onClick={() => handleDelete(item.id)} className="text-[10px] px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {items.length === 0 && (
              <div className="px-5 py-12 text-center text-gray-600">
                <div className="text-4xl mb-3 opacity-50">📦</div>
                <p className="text-sm">Henüz ürün eklenmemiş. "Ürün Ekle" ile başlayın.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* =================== SETTINGS TAB =================== */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {PLATFORMS.map(p => {
            const s = getSetting(p.key);
            return (
              <div key={p.key} className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    {p.icon} {p.label} Entegrasyonu
                  </h3>
                  <button
                    onClick={() => handleSettingSave(p.key, { is_enabled: !s.is_enabled })}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${s.is_enabled ? 'bg-green-500' : 'bg-gray-600'}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${s.is_enabled ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block mb-1">API Key</label>
                    <input
                      defaultValue={s.api_key}
                      onBlur={e => handleSettingSave(p.key, { api_key: e.target.value })}
                      placeholder="API anahtarınızı girin"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:border-[#ff5a00]/40 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block mb-1">API Secret</label>
                    <input
                      defaultValue={s.api_secret}
                      onBlur={e => handleSettingSave(p.key, { api_secret: e.target.value })}
                      type="password"
                      placeholder="API secret"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:border-[#ff5a00]/40 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block mb-1">Satıcı ID</label>
                    <input
                      defaultValue={s.seller_id}
                      onBlur={e => handleSettingSave(p.key, { seller_id: e.target.value })}
                      placeholder="Mağaza/Satıcı ID"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:border-[#ff5a00]/40 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block mb-1">Mağaza URL</label>
                    <input
                      defaultValue={s.store_url}
                      onBlur={e => handleSettingSave(p.key, { store_url: e.target.value })}
                      placeholder="https://..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:border-[#ff5a00]/40 outline-none"
                    />
                  </div>
                </div>
              </div>
            );
          })}

          <div className="bg-yellow-500/5 border border-yellow-500/15 rounded-2xl p-5">
            <p className="text-xs text-yellow-400/80">
              💡 <strong>Not:</strong> API anahtarlarınızı girdikten sonra "Ürünler" sekmesindeki "Senkronize Et" butonu ile pazaryeri ürünlerinizi otomatik çekebilirsiniz.
              API entegrasyonu henüz aktif değilse, ürünleri manuel olarak ekleyebilirsiniz.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
