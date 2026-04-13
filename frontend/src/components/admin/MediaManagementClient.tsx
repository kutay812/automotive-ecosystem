'use client';

import { useState, useRef } from 'react';
import { deleteMedia, uploadMedia } from '@/app/actions/admin';
import { useRouter } from 'next/navigation';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

function formatSize(kb: number): string {
  if (kb < 1) return `${(kb * 1024).toFixed(0)} B`;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function getRelatedLabel(type: string): string {
  if (!type) return '-';
  const map: Record<string, string> = {
    'api::car.car': '🚗 Araç',
    'api::project.project': '🎬 Proje',
    'api::office.office': '📍 Ofis',
  };
  return map[type] || type;
}

export default function MediaManagementClient({ media: initialMedia }: { media: any[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState('all');
  const [uploading, setUploading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredMedia = filter === 'all'
    ? initialMedia
    : filter === 'images'
    ? initialMedia.filter(f => f.mime?.startsWith('image/'))
    : filter === 'videos'
    ? initialMedia.filter(f => f.mime?.startsWith('video/'))
    : filter === 'unlinked'
    ? initialMedia.filter(f => !f.relatedType)
    : initialMedia;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    const res = await uploadMedia(formData);
    setUploading(false);
    if (res.error) alert(res.error);
    else router.refresh();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (fileId: number, fileName: string) => {
    if (!confirm(`"${fileName}" dosyasını silmek istediğinize emin misiniz?`)) return;
    setDeleteLoading(fileId);
    const res = await deleteMedia(fileId);
    setDeleteLoading(null);
    if (res.error) alert(res.error);
    else router.refresh();
  };

  const stats = {
    total: initialMedia.length,
    images: initialMedia.filter(f => f.mime?.startsWith('image/')).length,
    videos: initialMedia.filter(f => f.mime?.startsWith('video/')).length,
    unlinked: initialMedia.filter(f => !f.relatedType).length,
  };

  const filters = [
    { key: 'all', label: 'Tümü', count: stats.total },
    { key: 'images', label: '🖼️ Görseller', count: stats.images },
    { key: 'videos', label: '🎬 Videolar', count: stats.videos },
    { key: 'unlinked', label: '🔗 Bağlantısız', count: stats.unlinked },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Medya Yönetimi</h1>
          <p className="text-gray-500 text-sm mt-1">{stats.total} dosya • {stats.images} görsel • {stats.videos} video</p>
        </div>
        <div>
          <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" accept="image/*,video/*" />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="bg-[#ff5a00] hover:bg-[#ff5a00]/90 text-black font-bold px-6 py-3 rounded-xl transition-all text-sm shadow-[0_0_15px_rgba(255,90,0,0.3)] disabled:opacity-50"
          >
            {uploading ? '⏳ Yükleniyor...' : '📤 Dosya Yükle'}
          </button>
        </div>
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

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredMedia.map((file: any) => (
          <div key={file.id} className="bg-white/[0.03] border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-all group">
            {/* Önizleme */}
            <div className="aspect-square bg-black/40 flex items-center justify-center overflow-hidden">
              {file.mime?.startsWith('image/') ? (
                <img
                  src={`${STRAPI_URL}${file.url}`}
                  alt={file.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : file.mime?.startsWith('video/') ? (
                <div className="text-4xl">🎬</div>
              ) : (
                <div className="text-4xl">📄</div>
              )}
            </div>

            {/* Bilgi */}
            <div className="p-3 space-y-2">
              <p className="text-xs font-medium truncate" title={file.name}>{file.name}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500 uppercase">{file.ext?.replace('.', '')}</span>
                  <span className="text-[10px] text-gray-600">{formatSize(parseFloat(file.size || 0))}</span>
                </div>
              </div>
              {file.relatedType && (
                <p className="text-[10px] text-gray-500">{getRelatedLabel(file.relatedType)}</p>
              )}
              <button
                onClick={() => handleDelete(file.id, file.name)}
                disabled={deleteLoading === file.id}
                className="w-full mt-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 py-1.5 rounded-lg text-xs border border-red-500/30 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
              >
                {deleteLoading === file.id ? 'Siliniyor...' : '🗑️ Sil'}
              </button>
            </div>
          </div>
        ))}
        {filteredMedia.length === 0 && (
          <div className="col-span-full p-12 text-center text-gray-600">Bu kategoride dosya yok.</div>
        )}
      </div>
    </div>
  );
}
