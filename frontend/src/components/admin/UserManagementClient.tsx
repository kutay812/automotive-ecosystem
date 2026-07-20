'use client';

import { useState } from 'react';
import { updateUser, deleteUser } from '@/app/actions/admin';
import { useRouter } from 'next/navigation';

const providerBadge: Record<string, { label: string; color: string }> = {
  local: { label: 'E-posta', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  google: { label: 'Google', color: 'bg-red-500/10 text-red-400 border-red-500/30' },
};

export default function UserManagementClient({ users: initialUsers, roles }: { users: any[]; roles: any[] }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const filteredUsers = initialUsers.filter((u: any) =>
    (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.firstName || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.lastName || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.username || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleToggleBlock = async (user: any) => {
    setActionLoading(user.documentId);
    const res = await updateUser(user.documentId, { blocked: !user.blocked });
    setActionLoading(null);
    if ('error' in res && res.error) alert(res.error);
    else router.refresh();
  };

  const handleRoleChange = async (user: any, roleId: number) => {
    setActionLoading(user.documentId);
    const res = await updateUser(user.documentId, { roleId });
    setActionLoading(null);
    if ('error' in res && res.error) alert(res.error);
    else router.refresh();
  };

  const handleDelete = async (user: any) => {
    if (!confirm(`"${user.email}" kullanıcısını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) return;
    setActionLoading(user.documentId);
    const res = await deleteUser(user.documentId);
    setActionLoading(null);
    if ('error' in res && res.error) alert(res.error);
    else router.refresh();
  };

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Kullanıcı Yönetimi</h1>
          <p className="text-gray-500 text-sm mt-1">{initialUsers.length} kayıtlı kullanıcı</p>
        </div>
      </div>

      {/* Arama */}
      <div className="relative">
        <input
          type="text"
          placeholder="İsim, e-posta veya kullanıcı adı ara..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full max-w-md bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#ff5a00] placeholder:text-gray-600"
        />
      </div>

      {/* Roller Özeti */}
      <div className="flex flex-wrap gap-3">
        {roles.map((role: any) => (
          <div key={role.id} className="bg-white/[0.03] border border-white/5 rounded-xl px-4 py-2 flex items-center gap-2">
            <span className="text-sm font-medium">{role.name}</span>
            <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">{role.userCount} kullanıcı</span>
          </div>
        ))}
      </div>

      {/* Tablo */}
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-gray-500 text-xs uppercase tracking-wider">
                <th className="text-left p-4">Kullanıcı</th>
                <th className="text-left p-4">E-posta</th>
                <th className="text-left p-4">Sağlayıcı</th>
                <th className="text-left p-4">Rol</th>
                <th className="text-left p-4">Durum</th>
                <th className="text-left p-4">Kayıt</th>
                <th className="text-right p-4">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user: any) => {
                const prov = providerBadge[user.provider] || providerBadge.local;
                const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
                return (
                  <tr key={user.documentId} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="p-4">
                      <div>
                        <p className="font-medium">{fullName || user.username || '-'}</p>
                        <p className="text-xs text-gray-500">@{user.username}</p>
                      </div>
                    </td>
                    <td className="p-4 text-gray-400 text-xs">{user.email}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs border ${prov.color}`}>{prov.label}</span>
                    </td>
                    <td className="p-4">
                      <select
                        value={roles.find((r: any) => r.name === user.role)?.id || ''}
                        onChange={e => handleRoleChange(user, parseInt(e.target.value))}
                        disabled={actionLoading === user.documentId}
                        className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-[#ff5a00] disabled:opacity-50"
                      >
                        {roles.map((role: any) => (
                          <option key={role.id} value={role.id}>{role.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-4">
                      {user.blocked ? (
                        <span className="px-2 py-1 rounded-full text-xs border bg-red-500/10 text-red-400 border-red-500/30">Engelli</span>
                      ) : user.confirmed ? (
                        <span className="px-2 py-1 rounded-full text-xs border bg-green-500/10 text-green-400 border-green-500/30">Aktif</span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs border bg-yellow-500/10 text-yellow-400 border-yellow-500/30">Onay Bekliyor</span>
                      )}
                    </td>
                    <td className="p-4 text-gray-500 text-xs font-mono">{formatDate(user.createdAt)}</td>
                    <td className="p-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleToggleBlock(user)}
                          disabled={actionLoading === user.documentId}
                          className={`px-3 py-1.5 rounded-lg text-xs border transition-all disabled:opacity-50 font-medium ${
                            user.blocked
                              ? 'bg-green-500/10 hover:bg-green-500/20 text-green-400 border-green-500/30'
                              : 'bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                          }`}
                        >
                          {user.blocked ? '🔓 Engeli Kaldır' : '🔒 Engelle'}
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          disabled={actionLoading === user.documentId}
                          className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg text-xs border border-red-500/30 transition-all disabled:opacity-50 font-medium"
                        >
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredUsers.length === 0 && (
                <tr><td colSpan={7} className="p-12 text-center text-gray-600">Kullanıcı bulunamadı.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
