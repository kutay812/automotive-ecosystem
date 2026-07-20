'use client';

import { useState } from 'react';
import { createAdminPanelUser, updateAdminPanelUser, deleteAdminPanelUser, updateUser, deleteUser } from '@/app/actions/admin';
import { useRouter } from 'next/navigation';

const roleConfig: Record<string, { label: string; color: string; bg: string }> = {
  superadmin: { label: 'SuperAdmin', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
  admin:      { label: 'Admin',      color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30' },
  editor:     { label: 'Editör',     color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
};

const siteRoleConfig: Record<string, { label: string; color: string; bg: string }> = {
  Authenticated: { label: 'Üye', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  Public:        { label: 'Ziyaretçi', color: 'text-gray-400', bg: 'bg-gray-500/10 border-gray-500/30' },
};

interface PanelUser {
  id: number;
  documentId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export default function AdminUserManagementClient({ siteUsers, panelUsers: initialPanelUsers, adminRole, siteRoles, currentAdminId }: { siteUsers: any[], panelUsers: PanelUser[], adminRole?: string, siteRoles?: any[], currentAdminId?: number }) {
  const router = useRouter();
  const canManagePanelUsers = adminRole === 'superadmin' || adminRole === 'admin';
  const canManageSiteUsers = adminRole === 'superadmin' || adminRole === 'admin';
  const [tab, setTab] = useState<'panel' | 'site'>(canManagePanelUsers ? 'panel' : 'site');
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<PanelUser | null>(null);
  const [loading, setLoading] = useState(false);

  // Panel user form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('editor');

  // Site user edit state
  const [editingSiteUser, setEditingSiteUser] = useState<any>(null);
  const [siteFirstName, setSiteFirstName] = useState('');
  const [siteLastName, setSiteLastName] = useState('');
  const [sitePhoneNumber, setSitePhoneNumber] = useState('');
  const [siteBlocked, setSiteBlocked] = useState(false);
  const [siteRoleId, setSiteRoleId] = useState('');

  const resetForm = () => {
    setFirstName(''); setLastName(''); setEmail(''); setPassword(''); setRole('editor');
    setShowForm(false); setEditingUser(null);
  };

  const resetSiteForm = () => {
    setEditingSiteUser(null);
    setSiteFirstName(''); setSiteLastName(''); setSitePhoneNumber(''); setSiteBlocked(false); setSiteRoleId('');
  };

  const openEditForm = (user: PanelUser) => {
    setEditingUser(user);
    setFirstName(user.firstName); setLastName(user.lastName); setEmail(user.email);
    setPassword(''); setRole(user.role);
    setShowForm(true);
  };

  const openSiteEditForm = (user: any) => {
    setEditingSiteUser(user);
    setSiteFirstName(user.firstName || '');
    setSiteLastName(user.lastName || '');
    setSitePhoneNumber(user.phoneNumber || '');
    setSiteBlocked(user.blocked || false);
    const currentRole = siteRoles?.find(r => r.name === user.role || r.type === user.roleType);
    setSiteRoleId(currentRole?.id?.toString() || '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (editingUser) {
      const data: any = { firstName, lastName, email, role };
      if (password) data.password = password;
      const res = await updateAdminPanelUser(editingUser.documentId, data);
      if ('error' in res && res.error) alert(res.error);
      else { resetForm(); router.refresh(); }
    } else {
      if (!password) { alert('Şifre zorunludur.'); setLoading(false); return; }
      const res = await createAdminPanelUser({ firstName, lastName, email, password, role });
      if ('error' in res && res.error) alert(res.error);
      else { resetForm(); router.refresh(); }
    }
    setLoading(false);
  };

  const handleSiteUserUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSiteUser) return;
    setLoading(true);
    const data: any = { firstName: siteFirstName, lastName: siteLastName, blocked: siteBlocked, phoneNumber: sitePhoneNumber };
    if (siteRoleId) data.roleId = parseInt(siteRoleId);
    const res = await updateUser(editingSiteUser.documentId || String(editingSiteUser.id), data);
    if ('error' in res && res.error) alert(res.error);
    else { resetSiteForm(); router.refresh(); }
    setLoading(false);
  };

  const handleDelete = async (user: PanelUser) => {
    if (user.role === 'superadmin') { alert('SuperAdmin hesabı silinemez.'); return; }
    if (!confirm(`${user.firstName} ${user.lastName} (${user.email}) hesabını silmek istediğinize emin misiniz?`)) return;
    setLoading(true);
    const res = await deleteAdminPanelUser(user.documentId);
    if ('error' in res && res.error) alert(res.error);
    else router.refresh();
    setLoading(false);
  };

  const handleSiteUserDelete = async (user: any) => {
    if (!confirm(`${user.username || user.email} hesabını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) return;
    setLoading(true);
    const res = await deleteUser(user.documentId || String(user.id));
    if ('error' in res && res.error) alert(res.error);
    else router.refresh();
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black tracking-tight">
          <span className="text-[#ff5a00]">Kullanıcı</span> Yönetimi
        </h1>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-2">
        {canManagePanelUsers && (
          <button
            onClick={() => { setTab('panel'); resetSiteForm(); }}
            className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${tab === 'panel' ? 'bg-[#ff5a00]/10 text-[#ff5a00] border-[#ff5a00]/30' : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'}`}
          >
            🛡️ Panel Kullanıcıları ({initialPanelUsers.length})
          </button>
        )}
        <button
          onClick={() => { setTab('site'); resetForm(); }}
          className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${tab === 'site' ? 'bg-[#ff5a00]/10 text-[#ff5a00] border-[#ff5a00]/30' : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'}`}
        >
          👥 Site Kullanıcıları ({siteUsers.length})
        </button>
      </div>

      {/* ========== Panel Users Tab ========== */}
      {tab === 'panel' && canManagePanelUsers && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">Yönetim paneline erişimi olan hesaplar. SuperAdmin kayıtları yalnızca görüntülenir.</p>
            <button onClick={() => { resetForm(); setShowForm(true); }} className="bg-[#ff5a00] hover:bg-[#ff5a00]/90 text-black font-bold px-4 py-2 rounded-xl text-sm transition-all">
              + Yeni Kullanıcı Ekle
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-bold text-white mb-2">{editingUser ? '✏️ Kullanıcı Düzenle' : '➕ Yeni Kullanıcı Ekle'}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Ad</label>
                  <input value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" required />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Soyad</label>
                  <input value={lastName} onChange={e => setLastName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" required />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">E-posta</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" required />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Şifre {editingUser && '(boş bırakılırsa değişmez)'}</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" {...(!editingUser ? { required: true } : {})} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Rol</label>
                <select 
                  value={role} 
                  onChange={e => setRole(e.target.value)} 
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                >
                  <option value="admin">Admin — Kullanıcılar dahil tüm yönetim modülleri</option>
                  <option value="editor">Editör — Prodüksiyon İçerik + Medya</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={resetForm} className="px-4 py-2 bg-white/10 text-gray-400 rounded-lg text-sm hover:bg-white/20">İptal</button>
                <button type="submit" disabled={loading} className="px-4 py-2 bg-[#ff5a00] text-black font-bold rounded-lg text-sm hover:bg-[#ff5a00]/90 disabled:opacity-50">
                  {loading ? 'Kaydediliyor...' : editingUser ? 'Güncelle' : 'Oluştur'}
                </button>
              </div>
            </form>
          )}

          <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-gray-500 text-left">
                  <th className="p-4 font-semibold">Kullanıcı</th>
                  <th className="p-4 font-semibold">E-posta</th>
                  <th className="p-4 font-semibold">Rol</th>
                  <th className="p-4 font-semibold">Durum</th>
                  <th className="p-4 font-semibold text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {initialPanelUsers.map(user => {
                  const cfg = roleConfig[user.role] || { label: user.role, color: 'text-gray-400', bg: 'bg-gray-500/10 border-gray-500/30' };
                  const isSelf = user.id === currentAdminId;
                  
                  return (
                    <tr key={user.id} className={`border-b border-white/5 hover:bg-white/[0.02] ${isSelf ? 'bg-white/[0.01]' : ''}`}>
                      <td className="p-4 text-white font-medium">
                        {user.firstName} {user.lastName} 
                        {isSelf && <span className="ml-2 text-[10px] bg-white/10 text-gray-400 px-1.5 py-0.5 rounded italic">Ben</span>}
                      </td>
                      <td className="p-4 text-gray-400">{user.email}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                      </td>
                      <td className="p-4">
                        <span className={`text-xs font-semibold ${user.isActive ? 'text-green-400' : 'text-red-400'}`}>
                          {user.isActive ? '● Aktif' : '● Pasif'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {user.role !== 'superadmin' ? (
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => openEditForm(user)} className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-xs transition-all">Düzenle</button>
                            {!isSelf && <button onClick={() => handleDelete(user)} disabled={loading} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg text-xs border border-red-500/30 transition-all disabled:opacity-50">Sil</button>}
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-600 italic">🔒 Immutable</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {initialPanelUsers.length === 0 && (
                  <tr><td colSpan={5} className="p-12 text-center text-gray-600">Henüz panel kullanıcısı eklenmemiş.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========== Site Users Tab ========== */}
      {tab === 'site' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Siteye kayıtlı olan müşteri hesapları</p>

          {/* Site User Edit Form */}
          {editingSiteUser && canManageSiteUsers && (
            <form onSubmit={handleSiteUserUpdate} className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-bold text-white mb-2">✏️ Kullanıcı Düzenle — {editingSiteUser.email}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Ad</label>
                  <input value={siteFirstName} onChange={e => setSiteFirstName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Soyad</label>
                  <input value={siteLastName} onChange={e => setSiteLastName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Telefon Numarası</label>
                  <input value={sitePhoneNumber} onChange={e => setSitePhoneNumber(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" placeholder="+90 555 555 5555" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Hesap Durumu</label>
                  <select value={siteBlocked ? 'blocked' : 'active'} onChange={e => setSiteBlocked(e.target.value === 'blocked')} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm">
                    <option value="active">✅ Aktif</option>
                    <option value="blocked">🚫 Engelli</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Site Rolü</label>
                  <select value={siteRoleId} onChange={e => setSiteRoleId(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm">
                    <option value="">— Değiştirme —</option>
                    {(siteRoles || []).map((r: any) => (
                      <option key={r.id} value={r.id}>{r.name} ({r.type})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Hesap Durumu</label>
                  <select value={siteBlocked ? 'blocked' : 'active'} onChange={e => setSiteBlocked(e.target.value === 'blocked')} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm">
                    <option value="active">✅ Aktif</option>
                    <option value="blocked">🚫 Engelli</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={resetSiteForm} className="px-4 py-2 bg-white/10 text-gray-400 rounded-lg text-sm hover:bg-white/20">İptal</button>
                <button type="submit" disabled={loading} className="px-4 py-2 bg-[#ff5a00] text-black font-bold rounded-lg text-sm hover:bg-[#ff5a00]/90 disabled:opacity-50">
                  {loading ? 'Kaydediliyor...' : 'Güncelle'}
                </button>
              </div>
            </form>
          )}

          <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-gray-500 text-left">
                  <th className="p-4 font-semibold">Kullanıcı</th>
                  <th className="p-4 font-semibold">E-posta / Telefon</th>
                  <th className="p-4 font-semibold">Rol</th>
                  <th className="p-4 font-semibold">Giriş</th>
                  <th className="p-4 font-semibold">Durum</th>
                  <th className="p-4 font-semibold">Kayıt</th>
                  <th className="p-4 font-semibold text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {siteUsers.map((user: any) => {
                  const roleCfg = siteRoleConfig[user.role] || { label: user.role || 'Üye', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30' };
                  return (
                    <tr key={user.id || user.documentId} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="p-4 text-white font-medium">
                        <div>{user.firstName || user.username || '-'} {user.lastName || ''}</div>
                        {user.username && user.firstName && <div className="text-[11px] text-gray-600">@{user.username}</div>}
                      </td>
                      <td className="p-4">
                        <div className="text-gray-400">{user.email}</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">{user.phoneNumber || 'Telefon Yok'}</div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${roleCfg.bg} ${roleCfg.color}`}>
                          {roleCfg.label}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`text-[11px] px-2 py-0.5 rounded-md ${user.provider === 'google' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-white/5 text-gray-500 border border-white/10'}`}>
                          {user.provider === 'google' ? '🔗 Google' : '📧 E-posta'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`text-xs font-semibold ${user.blocked ? 'text-red-400' : 'text-green-400'}`}>
                          {user.blocked ? '🚫 Engelli' : '● Aktif'}
                        </span>
                      </td>
                      <td className="p-4 text-gray-500 text-xs">{user.createdAt ? new Date(user.createdAt).toLocaleDateString('tr-TR') : '-'}</td>
                      <td className="p-4 text-right">
                        <div className="flex gap-2 justify-end">
                          {canManageSiteUsers && (
                            <button onClick={() => openSiteEditForm(user)} className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-xs transition-all">
                              Düzenle
                            </button>
                          )}
                          {canManageSiteUsers && (
                            <button onClick={() => handleSiteUserDelete(user)} disabled={loading} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg text-xs border border-red-500/30 transition-all disabled:opacity-50">
                              Sil
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {siteUsers.length === 0 && (
                  <tr><td colSpan={7} className="p-12 text-center text-gray-600">Kayıtlı site kullanıcısı yok.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
