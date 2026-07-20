import { getAdminUser, hasRole } from '@/lib/admin-session';
import { redirect } from 'next/navigation';
import { fetchAdminOffices } from '@/app/actions/admin';
import AdminShell from '@/components/admin/AdminShell';
import OfficeManagementClient from '@/components/admin/OfficeManagementClient';

export const dynamic = 'force-dynamic';

export default async function OfislerPage() {
  const admin = await getAdminUser();
  if (!admin) redirect('/admin/login');
  if (!hasRole(admin, 'superadmin', 'admin')) redirect('/admin');

  const offices = await fetchAdminOffices();

  return (
    <AdminShell adminName={`${admin.firstName || ''} ${admin.lastName || ''}`.trim()} adminRole={admin.role}>
      <OfficeManagementClient offices={offices || []} />
    </AdminShell>
  );
}
