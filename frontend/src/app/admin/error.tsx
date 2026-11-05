'use client';

import { useEffect } from 'react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Yönetim paneli hatası:', error);
  }, [error]);

  return (
    <div
      role="alert"
      className="p-8 max-w-lg mx-auto my-12 bg-white/[0.03] rounded-2xl border border-red-500/30 text-center"
    >
      <div className="w-12 h-12 bg-red-500/15 text-red-400 rounded-full flex items-center justify-center mx-auto mb-3 border border-red-500/30">
        <span aria-hidden="true" className="material-symbols-outlined">
          error
        </span>
      </div>
      <h2 className="text-lg font-bold text-white">Yönetim Paneli Hatası</h2>
      <p className="mt-1 text-sm text-gray-400">
        İçerik yüklenirken bir problemle karşılaşıldı.
      </p>
      <button
        onClick={() => reset()}
        className="mt-5 px-5 py-2 rounded-xl bg-[#ff5a00] hover:bg-[#ff5a00]/90 text-black text-xs font-bold transition-colors cursor-pointer"
      >
        Tekrar Dene
      </button>
    </div>
  );
}
