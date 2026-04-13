import { getAdminUser } from '@/lib/admin-session';
import { redirect } from 'next/navigation';
import { fetchAdminOffices } from '@/app/actions/admin';
import AdminShell from '@/components/admin/AdminShell';
import OfficeManagementClient from '@/components/admin/OfficeManagementClient';

export const dynamic = 'force-dynamic';

export default async function OfislerPage() {
  const admin = await getAdminUser();
  if (!admin) redirect('/yonetim/giris');

  const offices = await fetchAdminOffices();

  return (
    <AdminShell adminName={`${admin.firstname || ''} ${admin.lastname || ''}`.trim()}>
      <OfficeManagementClient offices={offices || []} />
    </AdminShell>
  );
}
