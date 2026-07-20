'use client';

import { useState, useRef } from 'react';
import { createCar, updateCar, deleteCar, uploadMedia } from '@/app/actions/admin';
import { useRouter } from 'next/navigation';
import { getMediaUrl } from '@/lib/api';

export default function CarManagementClient({ cars: initialCars, offices = [] }: { cars: any[]; offices: any[] }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCar, setEditingCar] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [carImageUrl, setCarImageUrl] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    
    const res = await uploadMedia(fd);
    setUploading(false);
    
    if ('error' in res && res.error) {
      alert(res.error);
    } else if ('data' in res && res.data?.url) {
      setCarImageUrl(res.data.url);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const imageUrl = carImageUrl || (editingCar?.image?.url || editingCar?.imageUrl);
    
    let res;
    if (editingCar) {
      // Update Mode
      const updateData: any = {
        brand: formData.get('brand'),
        model: formData.get('model'),
        year: Number(formData.get('year')),
        pricePerDay: Number(formData.get('pricePerDay')),
        transmission: formData.get('transmission'),
        fuelType: formData.get('fuelType'),
        passengerCount: Number(formData.get('passengerCount')),
        luggageCount: Number(formData.get('luggageCount')),
        imageUrl: imageUrl,
        currentOfficeId: formData.get('currentOfficeId') || null,
      };
      res = await updateCar(editingCar.documentId, updateData);
    } else {
      // Create Mode
      if (carImageUrl) formData.set('imageUrl', carImageUrl);
      res = await createCar(formData);
    }

    setLoading(false);
    if ('error' in res && res.error) {
      alert(res.error);
    } else {
      setShowForm(false);
      setEditingCar(null);
      setCarImageUrl('');
      router.refresh();
    }
  };

  const handleEdit = (car: any) => {
    setEditingCar(car);
    setCarImageUrl(car.image?.url || car.imageUrl || '');
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleAvailability = async (car: any) => {
    const res = await updateCar(car.documentId, { isAvailable: !car.isAvailable });
    if ('error' in res && res.error) alert(res.error);
    else router.refresh();
  };

  const handleDelete = async (car: any) => {
    if (!confirm(`"${car.brand} ${car.model}" aracını silmek istediğinize emin misiniz?`)) return;
    const res = await deleteCar(car.documentId);
    if ('error' in res && res.error) alert(res.error);
    else router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Araç Yönetimi</h1>
          <p className="text-gray-500 text-sm mt-1">Araç filonuzu yönetin</p>
        </div>
        <button
          onClick={() => { 
            if (showForm && !editingCar) setShowForm(false);
            else { setShowForm(true); setEditingCar(null); setCarImageUrl(''); }
          }}
          className="bg-[#ff5a00] hover:bg-[#ff5a00]/90 text-black font-bold px-6 py-3 rounded-xl transition-all text-sm shadow-[0_0_15px_rgba(255,90,0,0.3)]"
        >
          {showForm && !editingCar ? '✕ İptal' : '+ Yeni Araç Ekle'}
        </button>
      </div>

      {/* Araç Ekleme/Düzenleme Formu */}
      {showForm && (
        <form 
          key={editingCar?.documentId || 'new'}
          onSubmit={handleSubmit} 
          ref={formRef}
          className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-4 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300"
        >
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-bold">{editingCar ? 'Aracı Düzenle' : 'Yeni Araç Bilgileri'}</h3>
            {editingCar && (
              <button 
                type="button" 
                onClick={() => { setEditingCar(null); setShowForm(false); setCarImageUrl(''); }}
                className="text-gray-500 hover:text-white text-xs"
              >
                ✕ Vazgeç
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="col-span-1 lg:col-span-1">
              <label className="block text-xs text-gray-400 mb-1">Marka *</label>
              <input name="brand" required defaultValue={editingCar?.brand || ''} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-[#ff5a00]" placeholder="BMW" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Model *</label>
              <input name="model" required defaultValue={editingCar?.model || ''} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-[#ff5a00]" placeholder="3 Serisi" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Yıl</label>
              <input name="year" type="number" defaultValue={editingCar?.year || '2025'} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-[#ff5a00]" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Günlük Fiyat (₺) *</label>
              <input name="pricePerDay" type="number" required defaultValue={editingCar?.pricePerDay || ''} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-[#ff5a00]" placeholder="1500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Vites</label>
              <select name="transmission" defaultValue={editingCar?.transmission || 'Otomatik'} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-[#ff5a00]">
                <option value="Otomatik">Otomatik</option>
                <option value="Manuel">Manuel</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Yakıt</label>
              <select name="fuelType" defaultValue={editingCar?.fuelType || 'Benzin'} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-[#ff5a00]">
                <option value="Benzin">Benzin</option>
                <option value="Dizel">Dizel</option>
                <option value="Elektrik">Elektrik</option>
                <option value="Hibrit">Hibrit</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Yolcu Sayısı</label>
              <input name="passengerCount" type="number" defaultValue={editingCar?.passengerCount || '5'} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-[#ff5a00]" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Bagaj Sayısı</label>
              <input name="luggageCount" type="number" defaultValue={editingCar?.luggageCount || '2'} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-[#ff5a00]" />
            </div>
            <div className="col-span-2 lg:col-span-4">
              <label className="block text-xs text-gray-400 mb-1">🏢 Mevcut Ofis (Aracın Şu Anki Konumu)</label>
              <select name="currentOfficeId" defaultValue={editingCar?.currentOfficeId || ''} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-[#ff5a00]">
                <option value="">— Ofis Atanmamış —</option>
                {offices.map((o: any) => (
                  <option key={o.documentId || o.id} value={o.name}>{o.name} — {o.city}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            <label className="block text-xs text-gray-400 mb-1">Araç Görseli</label>
            <div className="flex items-center gap-4">
              {carImageUrl ? (
                <div className="relative w-32 h-20 rounded-lg overflow-hidden border border-[#ff5a00]/30 shadow-[0_0_10px_rgba(255,90,0,0.2)]">
                  <img src={getMediaUrl(carImageUrl)} alt="Car Preview" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setCarImageUrl('')} className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] text-white">🔄 Değiştir</button>
                </div>
              ) : (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-32 h-20 border-2 border-dashed border-white/10 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-white/20 transition-all text-gray-500 hover:text-gray-400"
                >
                  <span className="text-xl">📸</span>
                  <span className="text-[10px]">Yükle</span>
                </div>
              )}
              <div className="flex-1">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
                <p className="text-[10px] text-gray-500">Transparan PNG veya temiz bir araba görseli önerilir.</p>
                {uploading && <p className="text-[10px] text-yellow-500 font-bold animate-pulse mt-1">Görsel yükleniyor...</p>}
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-2">
            <button 
              type="submit" 
              disabled={loading || uploading} 
              className="bg-[#ff5a00] hover:bg-[#ff5a00]/90 text-black font-bold px-10 py-3 rounded-xl transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(255,90,0,0.3)]"
            >
              {loading ? 'İşleniyor...' : (editingCar ? 'Değişiklikleri Kaydet' : 'Araç Ekle')}
            </button>
            {editingCar && (
              <button 
                type="button" 
                onClick={() => { setEditingCar(null); setShowForm(false); setCarImageUrl(''); }}
                className="bg-white/5 hover:bg-white/10 text-white font-bold px-6 py-3 rounded-xl transition-all border border-white/10"
              >
                Vazgeç
              </button>
            )}
          </div>
        </form>
      )}

      {/* Araç Listesi */}
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden glass">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-gray-500 text-xs uppercase tracking-wider">
                <th className="text-left p-4">Görsel</th>
                <th className="text-left p-4">Marka</th>
                <th className="text-left p-4">Model</th>
                <th className="text-left p-4">Yıl</th>
                <th className="text-left p-4">Günlük Fiyat</th>
                <th className="text-left p-4">Vites / Yakıt</th>
                <th className="text-left p-4">Ofis</th>
                <th className="text-left p-4">Durum</th>
                <th className="text-right p-4">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {initialCars.map((car: any) => (
                <tr key={car.documentId || car.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                  <td className="p-4">
                    <div className="w-16 h-10 bg-black/40 rounded overflow-hidden flex items-center justify-center border border-white/5 group-hover:border-[#ff5a00]/30 transition-colors">
                      {car.image?.url || car.imageUrl ? (
                        <img src={getMediaUrl(car.image?.url || car.imageUrl)} alt={car.brand} className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-xs text-gray-700">Görsel Yok</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 font-bold whitespace-nowrap">{car.brand}</td>
                  <td className="p-4 text-gray-300">{car.model}</td>
                  <td className="p-4 text-gray-400">{car.year}</td>
                  <td className="p-4 text-[#ff5a00] font-bold">₺{parseFloat(car.pricePerDay || 0).toLocaleString('tr-TR')}</td>
                  <td className="p-4 text-gray-400 text-xs">
                    {car.transmission} / {car.fuelType}
                  </td>
                  <td className="p-4">
                    {car.currentOfficeId
                      ? <span className="text-xs text-blue-300 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-lg">🏢 {car.currentOfficeId}</span>
                      : <span className="text-xs text-gray-600">—</span>
                    }
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-semibold border ${car.isAvailable !== false ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                      {car.isAvailable !== false ? 'Müsait' : 'Dolu'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex gap-2 justify-end opacity-60 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(car)}
                        title="Düzenle"
                        className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 px-3 py-1.5 rounded-lg text-xs border border-blue-500/30 transition-all"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleToggleAvailability(car)}
                        title={car.isAvailable !== false ? 'Dolu Yap' : 'Müsait Yap'}
                        className="bg-white/5 hover:bg-white/10 text-white px-3 py-1.5 rounded-lg text-xs border border-white/10 transition-all"
                      >
                        {car.isAvailable !== false ? '🔒' : '🔓'}
                      </button>
                      <button
                        onClick={() => handleDelete(car)}
                        title="Sil"
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg text-xs border border-red-500/30 transition-all font-bold"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {initialCars.length === 0 && (
                <tr><td colSpan={8} className="p-12 text-center text-gray-600">Henüz araç eklenmemiş.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
