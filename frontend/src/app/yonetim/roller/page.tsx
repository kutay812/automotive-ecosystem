import { getAdminUser } from '@/lib/admin-session';
import { redirect } from 'next/navigation';
import { fetchAdminRoles, fetchPermissions, fetchAdminUsers } from '@/app/actions/admin';
import AdminShell from '@/components/admin/AdminShell';
import RoleManagementClient from '@/components/admin/RoleManagementClient';

export default async function RollerPage() {
  const admin = await getAdminUser();
  if (!admin) redirect('/yonetim/giris');

  const [roles, permData, users] = await Promise.all([
    fetchAdminRoles(),
    fetchPermissions(),
    fetchAdminUsers(),
  ]);

  return (
    <AdminShell adminName={`${admin.firstname || ''} ${admin.lastname || ''}`.trim()}>
      <RoleManagementClient
        roles={roles || []}
        allPermissions={permData?.actions || []}
        groupedPermissions={permData?.grouped || {}}
        allUsers={users || []}
      />
    </AdminShell>
  );
}
