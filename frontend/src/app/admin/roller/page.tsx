import { getAdminUser, hasRole } from '@/lib/admin-session';
import { redirect } from 'next/navigation';
import { fetchAdminRoles, fetchPermissions, fetchAdminUsers } from '@/app/actions/admin';
import AdminShell from '@/components/admin/AdminShell';
import RoleManagementClient from '@/components/admin/RoleManagementClient';

export default async function RollerPage() {
  const admin = await getAdminUser();
  if (!admin) redirect('/admin/login');
  if (!hasRole(admin, 'superadmin')) redirect('/admin');

  const [roles, permData, users] = await Promise.all([
    fetchAdminRoles(),
    fetchPermissions(),
    fetchAdminUsers(),
  ]);

  return (
    <AdminShell adminName={`${admin.firstName || ''} ${admin.lastName || ''}`.trim()} adminRole={admin.role}>
      <RoleManagementClient
        roles={roles || []}
        allPermissions={permData?.actions || []}
        groupedPermissions={permData?.grouped || {}}
        allUsers={users || []}
      />
    </AdminShell>
  );
}
