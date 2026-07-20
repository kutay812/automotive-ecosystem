import { getAdminUser, hasRole } from '@/lib/admin-session';
import { redirect } from 'next/navigation';
import { fetchAdminUsers, fetchAdminPanelUsers, fetchAdminRoles } from '@/app/actions/admin';
import AdminShell from '@/components/admin/AdminShell';
import AdminUserManagementClient from '@/components/admin/AdminUserManagementClient';

export default async function KullanicilarPage() {
  const admin = await getAdminUser();
  if (!admin) redirect('/admin/login');
  if (!hasRole(admin, 'superadmin', 'admin')) redirect('/admin');

  const [siteUsers, panelUsers, siteRoles] = await Promise.all([
    fetchAdminUsers(),
    fetchAdminPanelUsers(),
    fetchAdminRoles(),
  ]);

  return (
    <AdminShell adminName={`${admin.firstName || ''} ${admin.lastName || ''}`.trim()} adminRole={admin.role}>
      <AdminUserManagementClient
        siteUsers={siteUsers || []}
        panelUsers={panelUsers || []}
        adminRole={admin.role}
        siteRoles={siteRoles || []}
        currentAdminId={admin.id}
      />
    </AdminShell>
  );
}
