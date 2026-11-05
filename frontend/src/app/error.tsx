'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Uygulama hatası:', error);
  }, [error]);

  return (
    <div
      role="alert"
      className="min-h-[65vh] flex flex-col items-center justify-center px-6 text-center bg-background"
    >
      <div className="w-16 h-16 rounded-full bg-error-container text-on-error-container flex items-center justify-center mb-4">
        <span aria-hidden="true" className="material-symbols-outlined text-[32px]">
          warning
        </span>
      </div>
      <h1 className="text-headline-md text-primary tracking-tight">
        Bir Şeyler Ters Gitti
      </h1>
      <p className="mt-2 text-body-md text-on-surface-variant max-w-md">
        İşleminiz gerçekleştirilirken beklenmeyen bir sorun oluştu. Lütfen tekrar deneyin veya ana sayfaya dönün.
      </p>
      <div className="mt-6 flex flex-wrap gap-3 justify-center">
        <button
          onClick={() => reset()}
          className="px-6 py-2.5 rounded-lg btn-cta text-label-md cursor-pointer"
        >
          Yeniden Dene
        </button>
        <Link href="/" className="px-6 py-2.5 rounded-lg btn-secondary text-label-md">
          Ana Sayfa
        </Link>
      </div>
    </div>
  );
}
