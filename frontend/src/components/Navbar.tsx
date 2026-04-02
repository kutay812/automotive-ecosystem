'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import Link from 'next/link';
import { useState } from 'react';
import { logoutUser } from '@/app/actions/auth';
import ContactModal from './ContactModal';

export default function Navbar({ user }: { user?: any }) {
  const { scrollY } = useScroll();
  const background = useTransform(
    scrollY,
    [0, 50],
    ['rgba(2, 2, 2, 0)', 'rgba(2, 2, 2, 0.85)']
  );
  const backdropFilter = useTransform(
    scrollY,
    [0, 50],
    ['blur(0px)', 'blur(12px)']
  );

  const [isOpen, setIsOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);

  return (
    <motion.header
      style={{ background, backdropFilter }}
      className="fixed top-0 w-full z-50 transition-colors duration-300 border-b border-transparent"
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <Link href="/">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="text-2xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary to-white"
          >
            VISIONARC
          </motion.div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex gap-8 items-center">
          <NavLink href="/">Kurumsal</NavLink>
          <NavLink href="/rentacar">Araç Kiralama</NavLink>
          <NavLink href="/production">Prodüksiyon</NavLink>
          
          {user ? (
            <div className="flex gap-4 items-center pl-6 border-l border-white/20 ml-2">
              <span className="text-sm font-bold text-gray-200">Hi, {user.username}</span>
              <button 
                onClick={() => logoutUser()} 
                className="text-xs px-3 py-1.5 bg-white/10 hover:bg-red-500/80 text-white rounded-md transition-colors"
              >
                Çıkış Yap
              </button>
            </div>
          ) : (
            <div className="flex gap-4 items-center pl-6 border-l border-white/20 ml-2">
              <Link href="/login" className="text-sm font-bold text-white hover:text-primary transition-colors">
                Giriş Yap
              </Link>
            </div>
          )}

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsContactOpen(true)}
            className="px-5 py-2.5 bg-primary/10 text-primary border border-primary/20 rounded-full hover:bg-primary/20 transition-all font-medium"
          >
            İletişim
          </motion.button>
        </nav>

        {/* Mobile Toggle */}
        <button 
          className="md:hidden text-white"
          onClick={() => setIsOpen(!isOpen)}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             {isOpen ? (
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
             ) : (
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
             )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden absolute top-full left-0 w-full glass p-6 flex flex-col gap-4 border-t border-white/10"
        >
          <Link href="/" onClick={() => setIsOpen(false)} className="text-white hover:text-primary transition-colors">Kurumsal</Link>
          <Link href="/rentacar" onClick={() => setIsOpen(false)} className="text-white hover:text-primary transition-colors">Araç Kiralama</Link>
          <Link href="/production" onClick={() => setIsOpen(false)} className="text-white hover:text-primary transition-colors">Prodüksiyon</Link>
          
          <div className="border-t border-white/10 my-1 pt-4">
            {user ? (
              <div className="flex justify-between items-center w-full">
                <span className="text-sm font-bold text-white">{user.username}</span>
                <button onClick={() => { setIsOpen(false); logoutUser() }} className="text-red-400 text-sm font-bold">Çıkış Yap</button>
              </div>
            ) : (
              <Link href="/login" onClick={() => setIsOpen(false)} className="text-white hover:text-primary transition-colors font-bold block">Giriş Yap</Link>
            )}
          </div>

          <button 
            onClick={() => { setIsOpen(false); setIsContactOpen(true); }} 
            className="w-full text-left text-primary hover:text-white transition-colors"
          >
            İletişim
          </button>
        </motion.div>
      )}

      <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
    </motion.header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href}>
      <motion.span
        whileHover={{ y: -2, color: '#FF5A00' }}
        className="text-sm font-medium text-gray-300 transition-colors"
      >
        {children}
      </motion.span>
    </Link>
  );
}
