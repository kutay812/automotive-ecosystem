'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { adminLogout } from '@/app/actions/admin';
import { useRouter } from 'next/navigation';
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
  { href: '/admin/destek',          label: 'Destek / Gelen Kutusu', icon: '📨', roles: ['superadmin', 'admin'] },
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

  useEffect(() => setMounted(true), []);

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
    <div className="min-h-screen bg-[#0a0a0a] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white/[0.02] border-r border-white/5 flex flex-col shrink-0">
        <div className="p-6 border-b border-white/5">
          <Link href="/admin" className="block">
            <h1 className="text-2xl font-black tracking-tight">
              <span className="text-[#ff5a00]">Example</span>
            </h1>
            <p className="text-[10px] text-gray-500 tracking-[0.3em] uppercase mt-1">Yönetim Paneli</p>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {visibleMenuItems.map((item) => {
            const isActive = mounted && pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[#ff5a00]/10 text-[#ff5a00] border border-[#ff5a00]/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
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
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 bg-white/[0.02] border-b border-white/5 flex items-center justify-between px-8">
          <div />
          <div className="flex items-center gap-4">
            {roleCfg && (
              <span className={`text-[10px] font-bold px-2 py-1 rounded-md border ${roleCfg.color} border-current/20 bg-current/5 uppercase tracking-wider`}>
                {roleCfg.label}
              </span>
            )}
            <span className="text-sm text-gray-400">{adminName || 'Admin'}</span>
            <button
              onClick={handleLogout}
              className="text-xs text-gray-500 hover:text-red-400 bg-white/5 hover:bg-red-500/10 px-3 py-1.5 rounded-lg border border-white/10 hover:border-red-500/30 transition-all"
            >
              Çıkış
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
