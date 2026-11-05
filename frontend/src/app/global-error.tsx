'use client';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="tr">
      <body className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 font-sans text-center">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">Kritik Sistem Hatası</h2>
          <p className="mt-2 text-sm text-slate-600">
            Sayfa yüklenirken beklenmeyen bir hata meydana geldi.
          </p>
          <button
            onClick={() => reset()}
            className="mt-6 w-full py-2.5 px-4 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors text-sm cursor-pointer"
          >
            Sayfayı Yenile
          </button>
        </div>
      </body>
    </html>
  );
}

