import { getAdminUser } from '@/lib/admin-session';
import { redirect } from 'next/navigation';
import { fetchAdminUsers, fetchAdminRoles } from '@/app/actions/admin';
import AdminShell from '@/components/admin/AdminShell';
import UserManagementClient from '@/components/admin/UserManagementClient';

export default async function KullanicilarPage() {
  const admin = await getAdminUser();
  if (!admin) redirect('/yonetim/giris');

  const [users, roles] = await Promise.all([
    fetchAdminUsers(),
    fetchAdminRoles(),
  ]);

  return (
    <AdminShell adminName={`${admin.firstname || ''} ${admin.lastname || ''}`.trim()}>
      <UserManagementClient users={users || []} roles={roles || []} />
    </AdminShell>
  );
}
