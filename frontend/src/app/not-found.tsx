import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center bg-background">
      <span
        aria-hidden="true"
        className="text-8xl font-black text-surface-dim select-none font-[family-name:var(--font-outfit)]"
      >
        404
      </span>
      <h1 className="mt-4 text-headline-lg text-primary tracking-tight">
        Sayfa Bulunamadı
      </h1>
      <p className="mt-2 text-body-md text-on-surface-variant max-w-md">
        Aradığınız sayfa kaldırılmış, adı değiştirilmiş veya geçici olarak kullanım dışı kalmış olabilir.
      </p>
      <div className="mt-8 flex flex-wrap gap-4 justify-center">
        <Link href="/" className="px-6 py-3 rounded-lg btn-primary text-label-md">
          Ana Sayfaya Dön
        </Link>
        <Link href="/rentacar" className="px-6 py-3 rounded-lg btn-secondary text-label-md">
          Araç Kiralama
        </Link>
      </div>
    </div>
  );
}
