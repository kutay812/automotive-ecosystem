'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { adminLogout } from '@/app/actions/admin';
import { useState, useEffect } from 'react';
import type { AdminRole } from '@/lib/admin-session';

// Menü öğeleri ve erişim hakları
const menuItems: { href: string; label: string; icon: string; roles: AdminRole[] }[] = [
  { href: '/admin',               label: 'Gösterge Paneli',   icon: '📊', roles: ['superadmin', 'admin', 'editor'] },
  { href: '/admin/anasayfa-icerik', label: 'Prodüksiyon İçerik', icon: '🎥', roles: ['superadmin', 'admin', 'editor'] },
  { href: '/admin/projelerimiz',   label: 'Projelerimiz',      icon: '📁', roles: ['superadmin', 'admin', 'editor'] },
  { href: '/admin/kiralamalar',    label: 'Kiralamalar',       icon: '📋', roles: ['superadmin', 'admin'] },
  { href: '/admin/muhasebe',       label: 'Muhasebe',          icon: '💰', roles: ['superadmin', 'admin'] },
  { href: '/admin/alisveris',      label: 'Alışveriş',         icon: '🛒', roles: ['superadmin', 'admin'] },
  { href: '/admin/araclar',        label: 'Araçlar',           icon: '🚗', roles: ['superadmin', 'admin'] },
  { href: '/admin/ofisler',        label: 'Ofis Yönetimi',     icon: '🏢', roles: ['superadmin', 'admin'] },
  { href: '/admin/medya',          label: 'Medya',             icon: '🖼️', roles: ['superadmin', 'admin', 'editor'] },
  { href: '/admin/kullanicilar',   label: 'Kullanıcılar',      icon: '👥', roles: ['superadmin', 'admin'] },
  { href: '/admin/destek',         label: 'Destek / Gelen Kutusu', icon: '📨', roles: ['superadmin', 'admin'] },
  { href: '/admin/roller',         label: 'Roller & İzinler',  icon: '🛡️', roles: ['superadmin'] },
];

const roleLabels: Record<AdminRole, { label: string; color: string }> = {
  superadmin: { label: 'SuperAdmin', color: 'text-red-400' },
  admin:      { label: 'Admin',      color: 'text-[#ff5a00]' },
  editor:     { label: 'Editör',     color: 'text-blue-400' },
};

export default function AdminShell({ children, adminName, adminRole }: { children: React.ReactNode; adminName?: string; adminRole?: AdminRole }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [sidebarOpen]);

  const handleLogout = async () => {
    await adminLogout();
    router.push('/admin/login');
  };

  // Filter menu items by role
  const visibleMenuItems = menuItems.filter(item =>
    adminRole ? item.roles.includes(adminRole) : false
  );

  const roleCfg = adminRole ? roleLabels[adminRole] : null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex relative">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          aria-hidden="true"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        id="admin-sidebar"
        aria-label="Yönetim Menüsü"
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0e0e0e] lg:bg-white/[0.02] border-r border-white/5 flex flex-col shrink-0 transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <Link href="/admin" className="block">
            <h1 className="text-2xl font-black tracking-tight">
              <span className="text-[#ff5a00]">Example</span>
            </h1>
            <p className="text-[10px] text-gray-500 tracking-[0.3em] uppercase mt-1">Yönetim Paneli</p>
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Menüyü Kapat"
            className="lg:hidden text-gray-400 hover:text-white p-1"
          >
            <span aria-hidden="true" className="material-symbols-outlined">close</span>
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {visibleMenuItems.map((item) => {
            const isActive = mounted && pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[#ff5a00]/10 text-[#ff5a00] border border-[#ff5a00]/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span aria-hidden="true" className="text-lg">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5">
          <Link href="/" className="flex items-center gap-2 px-4 py-2 text-xs text-gray-500 hover:text-gray-300 transition-colors">
            ← Ana Siteye Dön
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-white/[0.02] border-b border-white/5 flex items-center justify-between px-4 md:px-8">
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-expanded={sidebarOpen}
              aria-controls="admin-sidebar"
              aria-label="Yönetim Menüsünü Aç"
              className="lg:hidden text-gray-300 hover:text-white p-2 -ml-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <span aria-hidden="true" className="material-symbols-outlined">menu</span>
            </button>
          </div>
          <div className="flex items-center gap-3 md:gap-4">
            {roleCfg && (
              <span className={`text-[10px] font-bold px-2 py-1 rounded-md border ${roleCfg.color} border-current/20 bg-current/5 uppercase tracking-wider`}>
                {roleCfg.label}
              </span>
            )}
            <span className="text-xs md:text-sm text-gray-400 truncate max-w-[140px] md:max-w-none">{adminName || 'Admin'}</span>
            <button
              onClick={handleLogout}
              className="text-xs text-gray-500 hover:text-red-400 bg-white/5 hover:bg-red-500/10 px-3 py-1.5 rounded-lg border border-white/10 hover:border-red-500/30 transition-all"
            >
              Çıkış
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 md:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
