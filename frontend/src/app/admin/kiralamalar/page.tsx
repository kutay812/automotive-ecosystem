import { getAdminUser, hasRole } from '@/lib/admin-session';
import { redirect } from 'next/navigation';
import { fetchAdminRentals } from '@/app/actions/admin';
import AdminShell from '@/components/admin/AdminShell';
import RentalManagementClient from '@/components/admin/RentalManagementClient';

export default async function KiralamalarPage() {
  const admin = await getAdminUser();
  if (!admin) redirect('/admin/login');
  if (!hasRole(admin, 'superadmin', 'admin')) redirect('/admin');

  const rentals = await fetchAdminRentals();

  return (
    <AdminShell adminName={`${admin.firstName || ''} ${admin.lastName || ''}`.trim()} adminRole={admin.role}>
      <RentalManagementClient rentals={rentals || []} />
    </AdminShell>
  );
}
