'use client';

import Link from 'next/link';
import { useState } from 'react';
import { logoutUser } from '@/app/actions/auth';
import ContactModal from './ContactModal';

const ADMIN_ROLES = ['superadmin', 'admin', 'editor'];

export default function Navbar({ user, adminRole }: { user?: any; adminRole?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);

  const showAdminLink = adminRole && ADMIN_ROLES.includes(adminRole);

  return (
    <>
      <nav className="w-full h-16 flex items-center bg-background border-b border-outline-variant sticky top-0 z-50">
        <div className="flex justify-between items-center px-6 w-full max-w-[1280px] mx-auto">
          {/* Logo */}
          <Link href="/" className="text-display-lg-mobile font-extrabold tracking-tighter text-primary hover:opacity-80 transition-opacity">
            EXAMPLE
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex gap-8 items-center text-body-md">
            <Link href="/rentacar" className="text-on-surface-variant hover:text-secondary transition-colors duration-200">
              Kiralama
            </Link>
            <Link href="/alisveris" className="text-on-surface-variant hover:text-secondary transition-colors duration-200">
              Mağaza
            </Link>
            <Link href="/production" className="text-on-surface-variant hover:text-secondary transition-colors duration-200">
              Medya
            </Link>
          </div>

          {/* Right Actions */}
          <div className="flex gap-4 items-center text-primary">
            {user ? (
              <>
                <Link href="/profile" className="hover:text-secondary transition-colors duration-200" title="Profilim">
                  <span className="material-symbols-outlined">account_circle</span>
                </Link>
                {showAdminLink && (
                  <Link
                    href="/admin"
                    className="text-label-md px-3 py-1.5 bg-secondary text-on-secondary rounded hover:bg-secondary-container transition-all duration-300"
                  >
                    🛡️ Yönetim
                  </Link>
                )}
                <form action={logoutUser}>
                  <button
                    type="submit"
                    className="hover:text-secondary transition-colors duration-200"
                    title="Çıkış Yap"
                  >
                    <span className="material-symbols-outlined">logout</span>
                  </button>
                </form>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsContactOpen(true)}
                  className="hover:text-secondary transition-colors duration-200"
                  title="İletişim"
                >
                  <span className="material-symbols-outlined">mail</span>
                </button>
                <Link href="/login" className="hover:text-secondary transition-colors duration-200" title="Giriş Yap">
                  <span className="material-symbols-outlined">account_circle</span>
                </Link>
              </>
            )}

            {/* Mobile Menu Toggle */}
            <button
              className="md:hidden hover:text-secondary transition-colors duration-200"
              onClick={() => setIsOpen(!isOpen)}
            >
              <span className="material-symbols-outlined">
                {isOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 top-[104px] bg-background z-40 border-t border-outline-variant">
          <div className="flex flex-col p-6 gap-6">
            <Link href="/rentacar" onClick={() => setIsOpen(false)} className="text-headline-sm text-primary hover:text-secondary transition-colors">
              Kiralama
            </Link>
            <Link href="/alisveris" onClick={() => setIsOpen(false)} className="text-headline-sm text-primary hover:text-secondary transition-colors">
              Mağaza
            </Link>
            <Link href="/production" onClick={() => setIsOpen(false)} className="text-headline-sm text-primary hover:text-secondary transition-colors">
              Medya
            </Link>
            <div className="border-t border-outline-variant pt-6">
              {user ? (
                <div className="flex flex-col gap-4">
                  <Link href="/profile" onClick={() => setIsOpen(false)} className="text-body-lg text-on-surface-variant hover:text-secondary transition-colors">
                    Merhaba, {user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.username}
                  </Link>
                  {showAdminLink && (
                    <Link href="/admin" onClick={() => setIsOpen(false)} className="btn-cta text-center">
                      🛡️ Yönetim Paneli
                    </Link>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <Link href="/login" onClick={() => setIsOpen(false)} className="btn-primary text-center">
                    Giriş Yap
                  </Link>
                  <Link href="/register" onClick={() => setIsOpen(false)} className="btn-secondary text-center">
                    Kayıt Ol
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Contact Modal */}
      <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
    </>
  );
}
