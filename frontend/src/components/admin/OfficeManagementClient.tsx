'use client';

import { useState } from 'react';
import { createOffice, updateOffice, deleteOffice } from '@/app/actions/admin';
import { useRouter } from 'next/navigation';

export default function OfficeManagementClient({ offices: initialOffices }: { offices: any[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingOffice, setEditingOffice] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    
    const officeData = {
      name: formData.get('name') as string,
      city: formData.get('city') as string,
      address: formData.get('address') as string,
      phone: formData.get('phone') as string,
    };

    let res;
    if (editingOffice) {
      res = await updateOffice(editingOffice.documentId, officeData);
    } else {
      res = await createOffice(officeData);
    }

    setLoading(false);
    if (res.error) {
      alert(res.error);
    } else {
      setShowForm(false);
      setEditingOffice(null);
      router.refresh();
    }
  };

  const handleToggleStatus = async (office: any) => {
    const res = await updateOffice(office.documentId, { isActive: !office.isActive });
    if (res.error) alert(res.error);
    else router.refresh();
  };

  const handleDelete = async (office: any) => {
    if (!confirm(`"${office.name}" ofisini silmek istediğinize emin misiniz?`)) return;
    const res = await deleteOffice(office.documentId);
    if (res.error) alert(res.error);
    else router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Ofis Yönetimi</h1>
          <p className="text-gray-500 text-sm mt-1">Kiralama ofislerinizi ve şubelerinizi yönetin</p>
        </div>
        <button
          onClick={() => { 
            if (showForm && !editingOffice) setShowForm(false);
            else { setShowForm(true); setEditingOffice(null); }
          }}
          className="bg-[#ff5a00] hover:bg-[#ff5a00]/90 text-black font-bold px-6 py-3 rounded-xl transition-all text-sm shadow-[0_0_15px_rgba(255,90,0,0.3)]"
        >
          {showForm && !editingOffice ? '✕ İptal' : '+ Yeni Ofis Ekle'}
        </button>
      </div>

      {/* Ofis Ekleme/Düzenleme Formu */}
      {showForm && (
        <form 
          key={editingOffice?.documentId || 'new'}
          onSubmit={handleSubmit} 
          className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-4 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300"
        >
          <h3 className="text-lg font-bold mb-2">{editingOffice ? 'Ofisi Düzenle' : 'Yeni Ofis Bilgileri'}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Ofis Adı *</label>
              <input name="name" required defaultValue={editingOffice?.name || ''} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-[#ff5a00]" placeholder="Merkez Ofis" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Şehir *</label>
              <input name="city" required defaultValue={editingOffice?.city || ''} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-[#ff5a00]" placeholder="İstanbul" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-400 mb-1">Adres *</label>
              <textarea name="address" required defaultValue={editingOffice?.address || ''} rows={2} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-[#ff5a00]" placeholder="Tam adres bilgisi..." />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Telefon *</label>
              <input name="phone" required defaultValue={editingOffice?.phone || ''} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-[#ff5a00]" placeholder="0212 --- -- --" />
            </div>
          </div>

          <div className="flex gap-4 pt-2">
            <button 
              type="submit" 
              disabled={loading} 
              className="bg-[#ff5a00] hover:bg-[#ff5a00]/90 text-black font-bold px-10 py-3 rounded-xl transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(255,90,0,0.3)]"
            >
              {loading ? 'İşleniyor...' : (editingOffice ? 'Değişiklikleri Kaydet' : 'Ofis Ekle')}
            </button>
            {editingOffice && (
              <button 
                type="button" 
                onClick={() => { setEditingOffice(null); setShowForm(false); }}
                className="bg-white/5 hover:bg-white/10 text-white font-bold px-6 py-3 rounded-xl transition-all border border-white/10"
              >
                Vazgeç
              </button>
            )}
          </div>
        </form>
      )}

      {/* Ofis Listesi */}
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden glass">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-gray-500 text-xs uppercase tracking-wider">
                <th className="text-left p-4">Ofis / Şehir</th>
                <th className="text-left p-4">Adres</th>
                <th className="text-left p-4">Telefon</th>
                <th className="text-left p-4 text-center">Durum</th>
                <th className="text-right p-4">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {initialOffices.map((office: any) => (
                <tr key={office.documentId || office.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                  <td className="p-4">
                    <div className="font-bold">{office.name}</div>
                    <div className="text-xs text-gray-500">{office.city}</div>
                  </td>
                  <td className="p-4 text-gray-400 text-xs max-w-xs "><p className="truncate" title={office.address}>{office.address}</p></td>
                  <td className="p-4 text-gray-300 text-sm whitespace-nowrap">{office.phone}</td>
                  <td className="p-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-semibold border ${office.isActive !== false ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                      {office.isActive !== false ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex gap-2 justify-end opacity-60 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditingOffice(office); setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        title="Düzenle"
                        className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 px-3 py-1.5 rounded-lg text-xs border border-blue-500/30 transition-all font-bold"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleToggleStatus(office)}
                        title={office.isActive !== false ? 'Pasif Yap' : 'Aktif Yap'}
                        className="bg-white/5 hover:bg-white/10 text-white px-3 py-1.5 rounded-lg text-xs border border-white/10 transition-all"
                      >
                        {office.isActive !== false ? '🔒' : '🔓'}
                      </button>
                      <button
                        onClick={() => handleDelete(office)}
                        title="Sil"
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg text-xs border border-red-500/30 transition-all font-bold"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {initialOffices.length === 0 && (
                <tr><td colSpan={5} className="p-12 text-center text-gray-600">Henüz ofis eklenmemiş.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
