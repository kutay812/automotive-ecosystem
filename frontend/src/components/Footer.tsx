'use client';

import Link from 'next/link';
import { useState } from 'react';
import LegalModal from './LegalModal';
import { kvkkText, termsText } from '@/lib/legalTexts';

export default function Footer() {
  const [legalModal, setLegalModal] = useState<'privacy' | 'terms' | null>(null);

  return (
    <>
      <footer className="w-full py-8 bg-primary-container border-t border-white/10">
        <div className="flex flex-col md:flex-row justify-between items-center px-6 max-w-[1280px] mx-auto gap-4">
          {/* Logo */}
          <div className="text-headline-sm text-on-primary-container font-extrabold tracking-tighter">
            EXAMPLE
          </div>

          {/* Links */}
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/ofislerimiz" className="text-on-primary-container/80 text-caption hover:text-on-primary-container transition-opacity">
              Ofislerimiz
            </Link>
            <button
              onClick={() => setLegalModal('privacy')}
              className="text-on-primary-container/80 text-caption hover:text-on-primary-container transition-opacity"
            >
              Gizlilik Politikası
            </button>
            <button
              onClick={() => setLegalModal('terms')}
              className="text-on-primary-container/80 text-caption hover:text-on-primary-container transition-opacity"
            >
              Kullanım Şartları
            </button>
          </div>

          {/* Copyright */}
          <div className="text-on-primary-container/80 text-caption">
            © {new Date().getFullYear()} EXAMPLE. Tüm Hakları Saklıdır.
          </div>
        </div>
      </footer>

      {/* Legal Modal */}
      <LegalModal 
        isOpen={legalModal !== null} 
        onClose={() => setLegalModal(null)} 
        title={legalModal === 'privacy' ? 'Gizlilik Politikası' : 'Kullanım Şartları'}
        content={legalModal === 'privacy' ? kvkkText : termsText}
      />
    </>
  );
}
