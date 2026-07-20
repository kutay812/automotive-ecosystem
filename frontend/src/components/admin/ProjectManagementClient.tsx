'use client';

import { useState, useRef } from 'react';
import { createProject, updateProject, deleteProject, uploadProjectMedia } from '@/app/actions/admin';
import { useRouter } from 'next/navigation';
import { getMediaUrl } from '@/lib/api';

const mediaTypes = [
  { value: 'image', label: 'Görsel', icon: '🖼️', color: 'bg-green-500/10 text-green-400 border-green-500/30' },
  { value: 'youtube', label: 'YouTube', icon: '▶️', color: 'bg-red-500/10 text-red-400 border-red-500/30' },
  { value: 'mp4', label: 'MP4 Video', icon: '🎬', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
];

const defaultCategories = ['Genel', 'Araç Kiralama', 'Medya Prodüksiyon', 'E-Ticaret', 'Kurumsal'];

function getTypeBadge(type: string) {
  return mediaTypes.find(t => t.value === type) || mediaTypes[0];
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function getPreview(item: any) {
  if (item.mediaType === 'youtube') {
    const id = extractYouTubeId(item.mediaUrl);
    if (id) return `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
  }
  if (item.mediaType === 'image' && item.mediaUrl) return item.mediaUrl;
  if (item.thumbnailUrl) return item.thumbnailUrl;
  return null;
}

export default function ProjectManagementClient({ projects: initialProjects }: { projects: any[] }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    title: '', description: '', category: 'Genel',
    mediaType: 'image', mediaUrl: '', thumbnailUrl: '', sortOrder: 0,
  });

  const openCreate = () => {
    setEditItem(null);
    setFormData({ title: '', description: '', category: 'Genel', mediaType: 'image', mediaUrl: '', thumbnailUrl: '', sortOrder: 0 });
    setShowForm(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setFormData({
      title: item.title || '', description: item.description || '',
      category: item.category || 'Genel', mediaType: item.mediaType || 'image',
      mediaUrl: item.mediaUrl || '', thumbnailUrl: item.thumbnailUrl || '',
      sortOrder: item.sortOrder || 0,
    });
    setShowForm(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'mediaUrl' | 'thumbnailUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);

    const res = await uploadProjectMedia(fd);
    setUploading(false);

    if ('error' in res && res.error) {
      alert(res.error);
    } else if ('data' in res && res.data?.url) {
      setFormData(prev => ({ ...prev, [field]: res.data.url }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return alert('Proje başlığı gerekli.');
    setSaving(true);
    let res;
    if (editItem) {
      res = await updateProject(editItem.id, formData);
    } else {
      res = await createProject(formData);
    }
    setSaving(false);
    if ('error' in res && res.error) alert(res.error);
    else { setShowForm(false); router.refresh(); }
  };

  const handleDelete = async (item: any) => {
    if (!confirm(`"${item.title || 'Bu proje'}" silinecek. Emin misiniz?`)) return;
    setDeleteLoading(item.id);
    const res = await deleteProject(item.id);
    setDeleteLoading(null);
    if ('error' in res && res.error) alert(res.error);
    else router.refresh();
  };

  const handleToggleActive = async (item: any) => {
    setSaving(true);
    const res = await updateProject(item.id, { isActive: !item.isActive });
    setSaving(false);
    if ('error' in res && res.error) alert(res.error);
    else router.refresh();
  };

  const getUrlPlaceholder = () => {
    switch (formData.mediaType) {
      case 'image': return 'https://example.com/image.jpg veya dosya yükleyin';
      case 'youtube': return 'https://www.youtube.com/watch?v=abc123';
      case 'mp4': return 'https://example.com/video.mp4 veya dosya yükleyin';
      default: return 'https://...';
    }
  };

  // Unique categories from data
  const categories = Array.from(new Set([...defaultCategories, ...initialProjects.map(p => p.category).filter(Boolean)]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Proje Yönetimi</h1>
          <p className="text-gray-500 text-sm mt-1">Projelerimiz sayfasında görüntülenecek içerikler • {initialProjects.length} proje</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-[#ff5a00] hover:bg-[#ff5a00]/90 text-black font-bold px-6 py-3 rounded-xl transition-all text-sm shadow-[0_0_15px_rgba(255,90,0,0.3)]"
        >
          + Yeni Proje Ekle
        </button>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-3">
        {mediaTypes.map(t => {
          const count = initialProjects.filter(p => p.mediaType === t.value).length;
          return (
            <div key={t.value} className={`px-4 py-2 rounded-xl border text-xs font-medium ${t.color}`}>
              {t.icon} {t.label}: {count}
            </div>
          );
        })}
        <div className="px-4 py-2 rounded-xl border text-xs font-medium bg-[#ff5a00]/10 text-[#ff5a00] border-[#ff5a00]/30">
          📁 Toplam: {initialProjects.length}
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white/[0.03] border border-[#ff5a00]/30 rounded-2xl p-6">
          <h3 className="font-bold mb-4">{editItem ? '✏️ Proje Düzenle' : '➕ Yeni Proje Ekle'}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Medya Tipi */}
            <div>
              <label className="text-xs text-gray-500 block mb-2">Medya Tipi</label>
              <div className="flex flex-wrap gap-2">
                {mediaTypes.map(t => (
                  <button
                    key={t.value} type="button"
                    onClick={() => setFormData(p => ({ ...p, mediaType: t.value }))}
                    className={`px-4 py-2 rounded-xl text-sm border transition-all ${
                      formData.mediaType === t.value
                        ? 'bg-[#ff5a00]/10 text-[#ff5a00] border-[#ff5a00]/30 font-bold'
                        : 'bg-white/[0.03] text-gray-400 border-white/5 hover:border-white/10'
                    }`}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="text-xs text-gray-500 block mb-1">Başlık *</label>
                <input
                  value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                  placeholder="Ör: Kurumsal Reklam Filmi" required
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-[#ff5a00]"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Kategori</label>
                <select
                  value={formData.category} onChange={e => setFormData(p => ({ ...p, category: e.target.value }))}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-[#ff5a00] [color-scheme:dark]"
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Sıralama</label>
                <input
                  type="number" value={formData.sortOrder} onChange={e => setFormData(p => ({ ...p, sortOrder: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-[#ff5a00]"
                />
              </div>
            </div>

            {/* Medya URL */}
            <div className="space-y-2">
              <label className="text-xs text-gray-500 block mb-1">
                {formData.mediaType === 'image' ? 'Görsel URL / Dosya' : 'Video URL / Dosya'} *
              </label>
              <div className="flex flex-col md:flex-row gap-2">
                <input
                  value={formData.mediaUrl} onChange={e => setFormData(p => ({ ...p, mediaUrl: e.target.value }))}
                  placeholder={getUrlPlaceholder()}
                  className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-[#ff5a00]"
                />

                {(formData.mediaType === 'mp4' || formData.mediaType === 'image') && (
                  <>
                    <input
                      type="file"
                      ref={formData.mediaType === 'image' ? imageInputRef : fileInputRef}
                      onChange={e => handleFileUpload(e, 'mediaUrl')}
                      accept={formData.mediaType === 'image' ? 'image/*' : 'video/mp4,video/*'}
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => (formData.mediaType === 'image' ? imageInputRef : fileInputRef).current?.click()}
                      className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                      {uploading ? '⌛ Yükleniyor...' : '📂 Dosya Yükle'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Thumbnail */}
            {formData.mediaType !== 'image' && (
              <div>
                <label className="text-xs text-gray-500 block mb-1">Kapak Görseli URL (Opsiyonel)</label>
                <input
                  value={formData.thumbnailUrl} onChange={e => setFormData(p => ({ ...p, thumbnailUrl: e.target.value }))}
                  placeholder="https://example.com/thumbnail.jpg"
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-[#ff5a00]"
                />
              </div>
            )}

            {/* Açıklama */}
            <div>
              <label className="text-xs text-gray-500 block mb-1">Açıklama</label>
              <textarea
                value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                placeholder="Proje hakkında kısa açıklama" rows={3}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-[#ff5a00] resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button type="submit" disabled={saving || uploading} className="bg-[#ff5a00] hover:bg-[#ff5a00]/90 text-black font-bold px-6 py-2.5 rounded-xl text-sm disabled:opacity-50 shadow-[0_0_15px_rgba(255,90,0,0.3)]">
                {saving ? '⏳ Kaydediliyor...' : editItem ? '💾 Güncelle' : '➕ Ekle'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 px-4 py-2.5 text-sm hover:text-white">İptal</button>
            </div>
          </form>
        </div>
      )}

      {/* Proje Listesi */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {initialProjects.map((item: any) => {
          const typeBadge = getTypeBadge(item.mediaType);
          const preview = getPreview(item);
          return (
            <div
              key={item.id}
              className={`bg-white/[0.03] border rounded-2xl overflow-hidden transition-all hover:border-white/10 ${
                item.isActive ? 'border-white/5' : 'border-red-500/20 opacity-60'
              }`}
            >
              {/* Önizleme */}
              <div className="aspect-video bg-black/40 flex items-center justify-center overflow-hidden relative">
                {preview ? (
                  <img src={getMediaUrl(preview)} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <span className="text-5xl">{typeBadge.icon}</span>
                )}
                <div className="absolute top-2 left-2">
                  <span className="px-2 py-1 rounded-full text-[10px] bg-black/60 text-white font-medium backdrop-blur-sm">
                    {item.category}
                  </span>
                </div>
                <div className="absolute top-2 right-2">
                  <span className={`px-2 py-1 rounded-full text-[10px] border font-medium ${typeBadge.color}`}>
                    {typeBadge.icon} {typeBadge.label}
                  </span>
                </div>
                {!item.isActive && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-xs text-red-400 font-bold bg-red-500/20 px-3 py-1 rounded-full border border-red-500/30">Devre Dışı</span>
                  </div>
                )}
              </div>

              {/* Bilgi */}
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="font-bold text-sm truncate">{item.title || 'Başlıksız'}</h3>
                  {item.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.description}</p>}
                </div>
                {item.mediaUrl && <p className="text-[10px] text-gray-600 truncate font-mono">{item.mediaUrl}</p>}
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <span className="text-[10px] text-gray-600">Sıra: {item.sortOrder}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleActive(item)}
                      className={`px-2 py-1 rounded-lg text-[10px] border transition-all ${
                        item.isActive
                          ? 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20'
                          : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/20'
                      }`}
                    >
                      {item.isActive ? '✅ Aktif' : '⏸️ Pasif'}
                    </button>
                    <button
                      onClick={() => openEdit(item)}
                      className="bg-white/5 hover:bg-white/10 text-white px-2 py-1 rounded-lg text-[10px] border border-white/10 transition-all"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      disabled={deleteLoading === item.id}
                      className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-2 py-1 rounded-lg text-[10px] border border-red-500/30 transition-all disabled:opacity-50"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {initialProjects.length === 0 && (
          <div className="col-span-full p-12 text-center text-gray-600 bg-white/[0.02] border border-white/5 rounded-2xl">
            <p className="text-lg mb-2">Henüz proje eklenmemiş</p>
            <p className="text-sm text-gray-700">Görsel, YouTube veya MP4 video ekleyerek ilk projenizi oluşturun.</p>
          </div>
        )}
      </div>
    </div>
  );
}
