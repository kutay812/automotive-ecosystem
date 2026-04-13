import { getAdminUser } from '@/lib/admin-session';
import { redirect } from 'next/navigation';
import { fetchAdminRentals } from '@/app/actions/admin';
import AdminShell from '@/components/admin/AdminShell';
import RentalManagementClient from '@/components/admin/RentalManagementClient';

export default async function KiralamalarPage() {
  const admin = await getAdminUser();
  if (!admin) redirect('/yonetim/giris');

  const rentals = await fetchAdminRentals();

  return (
    <AdminShell adminName={`${admin.firstname || ''} ${admin.lastname || ''}`.trim()}>
      <RentalManagementClient rentals={rentals || []} />
    </AdminShell>
  );
}
