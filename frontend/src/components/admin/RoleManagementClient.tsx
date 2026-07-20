'use client';

import { useState } from 'react';
import {
  createRole, updateRole, deleteRole,
  updateRolePermissions, assignUsersToRole,
} from '@/app/actions/admin';
import { useRouter } from 'next/navigation';

// İzin aksiyonlarını Türkçe'ye çevirme
const actionLabels: Record<string, string> = {
  find: 'Listeleme', findOne: 'Detay Görme', create: 'Oluşturma',
  update: 'Güncelleme', delete: 'Silme',
  callback: 'Geri Dönüş', changePassword: 'Şifre Değiştirme',
  connect: 'Bağlantı', emailConfirmation: 'E-posta Doğrulama',
  forgotPassword: 'Şifre Sıfırlama', logout: 'Çıkış',
  refresh: 'Token Yenileme', register: 'Kayıt Olma',
  resetPassword: 'Şifre Resetleme', sendEmailConfirmation: 'Doğrulama E-postası',
  me: 'Profil Görme',
};
const groupLabels: Record<string, string> = {
  car: '🚗 Araçlar',
  rental: '📋 Kiralamalar',
  office: '📍 Ofisler',
  lead: '📩 İletişim Formu',
  project: '🎬 Projeler',
  'production-project': '🎥 Prodüksiyon',
  'plugin_users-permissions': '👥 Kimlik & Yetkilendirme',
};

function getActionLabel(action: string): string {
  const parts = action.split('.');
  const lastPart = parts[parts.length - 1];
  return actionLabels[lastPart] || lastPart;
}

function getGroupLabel(group: string): string {
  return groupLabels[group] || group;
}

interface RoleManagementProps {
  roles: any[];
  allPermissions: string[];
  groupedPermissions: Record<string, string[]>;
  allUsers: any[];
}

export default function RoleManagementClient({ roles: initialRoles, allPermissions, groupedPermissions, allUsers }: RoleManagementProps) {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'permissions' | 'users'>('permissions');
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingName, setEditingName] = useState(false);

  // Rol seç
  const selectRole = (role: any) => {
    setSelectedRole(role);
    setSelectedPerms(new Set(role.permissions?.map((p: any) => p.action) || []));
    setActiveTab('permissions');
    setEditingName(false);
  };

  // İzin toggle
  const togglePerm = (action: string) => {
    setSelectedPerms(prev => {
      const next = new Set(prev);
      if (next.has(action)) next.delete(action);
      else next.add(action);
      return next;
    });
  };

  // Gruptaki tüm izinleri toggle
  const toggleGroup = (actions: string[]) => {
    const allSelected = actions.every(a => selectedPerms.has(a));
    setSelectedPerms(prev => {
      const next = new Set(prev);
      if (allSelected) {
        actions.forEach(a => next.delete(a));
      } else {
        actions.forEach(a => next.add(a));
      }
      return next;
    });
  };

  // İzinleri kaydet
  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    setSaving(true);
    const res = await updateRolePermissions(selectedRole.id, Array.from(selectedPerms));
    setSaving(false);
    if ('error' in res && res.error) alert(res.error);
    else router.refresh();
  };

  // Rol oluştur
  const handleCreateRole = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = form.get('name') as string;
    const description = form.get('description') as string;
    if (!name) return;
    setSaving(true);
    const res = await createRole(name, description);
    setSaving(false);
    if ('error' in res && res.error) alert(res.error);
    else { setShowCreateForm(false); router.refresh(); }
  };

  // Rol adını güncelle
  const handleUpdateName = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedRole) return;
    const form = new FormData(e.currentTarget);
    setSaving(true);
    const res = await updateRole(selectedRole.id, {
      name: form.get('name') as string,
      description: form.get('description') as string,
    });
    setSaving(false);
    if ('error' in res && res.error) alert(res.error);
    else { setEditingName(false); router.refresh(); }
  };

  // Rol sil
  const handleDeleteRole = async (role: any) => {
    if (!confirm(`"${role.name}" rolünü silmek istediğinize emin misiniz?`)) return;
    setSaving(true);
    const res = await deleteRole(role.id);
    setSaving(false);
    if ('error' in res && res.error) alert(res.error);
    else { setSelectedRole(null); router.refresh(); }
  };

  // Kullanıcıyı role ata
  const handleAssignUser = async (userId: number) => {
    if (!selectedRole) return;
    setSaving(true);
    const res = await assignUsersToRole(selectedRole.id, [userId]);
    setSaving(false);
    if ('error' in res && res.error) alert(res.error);
    else router.refresh();
  };

  const isDefault = (role: any) => ['authenticated', 'public'].includes(role.type);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Roller & İzinler</h1>
          <p className="text-gray-500 text-sm mt-1">{initialRoles.length} rol tanımlı</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-[#ff5a00] hover:bg-[#ff5a00]/90 text-black font-bold px-6 py-3 rounded-xl transition-all text-sm shadow-[0_0_15px_rgba(255,90,0,0.3)]"
        >
          + Yeni Rol
        </button>
      </div>

      {/* Yeni Rol Formu */}
      {showCreateForm && (
        <div className="bg-white/[0.03] border border-[#ff5a00]/30 rounded-2xl p-6">
          <h3 className="font-bold mb-4">Yeni Rol Oluştur</h3>
          <form onSubmit={handleCreateRole} className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Rol Adı *</label>
              <input name="name" required placeholder="VIP Müşteri" className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#ff5a00] w-48" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Açıklama</label>
              <input name="description" placeholder="Özel müşteriler için" className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#ff5a00] w-64" />
            </div>
            <button type="submit" disabled={saving} className="bg-green-500/20 text-green-400 px-4 py-2 rounded-lg border border-green-500/30 text-sm font-medium disabled:opacity-50">Oluştur</button>
            <button type="button" onClick={() => setShowCreateForm(false)} className="text-gray-400 px-4 py-2 rounded-lg text-sm hover:text-white">İptal</button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        {/* Sol: Rol Listesi */}
        <div className="col-span-12 lg:col-span-4 space-y-2">
          {initialRoles.map((role: any) => (
            <button
              key={role.id}
              onClick={() => selectRole(role)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                selectedRole?.id === role.id
                  ? 'bg-[#ff5a00]/10 border-[#ff5a00]/30 text-white'
                  : 'bg-white/[0.03] border-white/5 text-gray-300 hover:border-white/10'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-sm">{role.name}</span>
                {isDefault(role) && (
                  <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full">Varsayılan</span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>👥 {role.userCount} kullanıcı</span>
                <span>🔑 {role.permissions?.length || 0} izin</span>
              </div>
              {role.description && <p className="text-xs text-gray-600 mt-1.5">{role.description}</p>}
            </button>
          ))}
        </div>

        {/* Sağ: Detay Paneli */}
        <div className="col-span-12 lg:col-span-8">
          {!selectedRole ? (
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-12 text-center">
              <p className="text-gray-600 text-lg">← Düzenlemek için bir rol seçin</p>
            </div>
          ) : (
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
              {/* Rol Başlığı */}
              <div className="p-6 border-b border-white/5">
                {editingName ? (
                  <form onSubmit={handleUpdateName} className="flex flex-wrap gap-3 items-end">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Rol Adı</label>
                      <input name="name" defaultValue={selectedRole.name} className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#ff5a00] w-48" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Açıklama</label>
                      <input name="description" defaultValue={selectedRole.description} className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#ff5a00] w-64" />
                    </div>
                    <button type="submit" disabled={saving} className="bg-green-500/20 text-green-400 px-3 py-2 rounded-lg border border-green-500/30 text-xs disabled:opacity-50">Kaydet</button>
                    <button type="button" onClick={() => setEditingName(false)} className="text-gray-400 px-3 py-2 text-xs">İptal</button>
                  </form>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold">{selectedRole.name}</h2>
                      <p className="text-sm text-gray-500 mt-1">{selectedRole.description || 'Açıklama yok'}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setEditingName(true)} className="bg-white/5 hover:bg-white/10 text-white px-3 py-1.5 rounded-lg text-xs border border-white/10 transition-all">✏️ Düzenle</button>
                      {!isDefault(selectedRole) && (
                        <button onClick={() => handleDeleteRole(selectedRole)} disabled={saving} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg text-xs border border-red-500/30 transition-all disabled:opacity-50">🗑️ Sil</button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Sekme Seçici */}
              <div className="flex border-b border-white/5">
                <button
                  onClick={() => setActiveTab('permissions')}
                  className={`px-6 py-3 text-sm font-medium transition-all ${activeTab === 'permissions' ? 'text-[#ff5a00] border-b-2 border-[#ff5a00]' : 'text-gray-500 hover:text-white'}`}
                >
                  🔑 İzinler ({selectedPerms.size})
                </button>
                <button
                  onClick={() => setActiveTab('users')}
                  className={`px-6 py-3 text-sm font-medium transition-all ${activeTab === 'users' ? 'text-[#ff5a00] border-b-2 border-[#ff5a00]' : 'text-gray-500 hover:text-white'}`}
                >
                  👥 Kullanıcılar ({selectedRole.userCount})
                </button>
              </div>

              {/* İzinler Sekmesi */}
              {activeTab === 'permissions' && (
                <div className="p-6 space-y-5 max-h-[500px] overflow-y-auto">
                  {Object.entries(groupedPermissions).map(([group, actions]) => {
                    const allSelected = actions.every(a => selectedPerms.has(a));
                    const someSelected = actions.some(a => selectedPerms.has(a));
                    return (
                      <div key={group} className="space-y-2">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => toggleGroup(actions)}
                            className={`w-5 h-5 rounded border flex items-center justify-center text-xs transition-all ${
                              allSelected ? 'bg-[#ff5a00] border-[#ff5a00] text-black' :
                              someSelected ? 'bg-[#ff5a00]/30 border-[#ff5a00]/50 text-[#ff5a00]' :
                              'border-white/20 text-transparent hover:border-white/40'
                            }`}
                          >
                            {allSelected ? '✓' : someSelected ? '−' : ''}
                          </button>
                          <span className="font-bold text-sm">{getGroupLabel(group)}</span>
                          <span className="text-[10px] text-gray-600">{actions.filter(a => selectedPerms.has(a)).length}/{actions.length}</span>
                        </div>
                        <div className="ml-8 flex flex-wrap gap-2">
                          {actions.map(action => (
                            <button
                              key={action}
                              onClick={() => togglePerm(action)}
                              className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                                selectedPerms.has(action)
                                  ? 'bg-[#ff5a00]/10 text-[#ff5a00] border-[#ff5a00]/30'
                                  : 'bg-white/[0.02] text-gray-500 border-white/5 hover:border-white/10'
                              }`}
                            >
                              {getActionLabel(action)}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {Object.keys(groupedPermissions).length === 0 && (
                    <p className="text-gray-600 text-center py-8">Henüz tanımlı izin yok.</p>
                  )}
                  {/* Kaydet Butonu */}
                  <div className="pt-4 border-t border-white/5">
                    <button
                      onClick={handleSavePermissions}
                      disabled={saving}
                      className="bg-[#ff5a00] hover:bg-[#ff5a00]/90 text-black font-bold px-6 py-3 rounded-xl transition-all text-sm shadow-[0_0_15px_rgba(255,90,0,0.3)] disabled:opacity-50"
                    >
                      {saving ? '⏳ Kaydediliyor...' : '💾 İzinleri Kaydet'}
                    </button>
                  </div>
                </div>
              )}

              {/* Kullanıcılar Sekmesi */}
              {activeTab === 'users' && (
                <div className="p-6 space-y-4 max-h-[500px] overflow-y-auto">
                  <p className="text-xs text-gray-500 mb-2">Bu role atanmamış bir kullanıcıyı seçerek atayabilirsiniz:</p>
                  {/* Rol atanamış kullanıcılar */}
                  <div className="space-y-2">
                    <h4 className="text-xs uppercase tracking-wider text-gray-500 font-bold">Bu Roldeki Kullanıcılar</h4>
                    {(selectedRole.permissions ? allUsers.filter((u: any) => u.role === selectedRole.name) : []).map((user: any) => (
                      <div key={user.id} className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                        <div>
                          <p className="text-sm font-medium">{user.firstName || ''} {user.lastName || ''}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                        <span className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-full border border-green-500/30">Atanmış</span>
                      </div>
                    ))}
                  </div>

                  {/* Atanmamış kullanıcılar */}
                  <div className="space-y-2 mt-4">
                    <h4 className="text-xs uppercase tracking-wider text-gray-500 font-bold">Diğer Kullanıcılar</h4>
                    {allUsers.filter((u: any) => u.role !== selectedRole.name).map((user: any) => (
                      <div key={user.id} className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                        <div>
                          <p className="text-sm font-medium">{user.firstName || ''} {user.lastName || ''}</p>
                          <p className="text-xs text-gray-500">{user.email} • <span className="text-gray-600">{user.role}</span></p>
                        </div>
                        <button
                          onClick={() => handleAssignUser(user.id)}
                          disabled={saving}
                          className="text-xs text-[#ff5a00] bg-[#ff5a00]/10 px-3 py-1.5 rounded-lg border border-[#ff5a00]/30 hover:bg-[#ff5a00]/20 transition-all disabled:opacity-50"
                        >
                          Bu Role Ata
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
