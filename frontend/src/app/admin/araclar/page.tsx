import { getAdminUser, hasRole } from '@/lib/admin-session';
import { redirect } from 'next/navigation';
import { fetchAdminCars, fetchAdminOffices } from '@/app/actions/admin';
import AdminShell from '@/components/admin/AdminShell';
import CarManagementClient from '@/components/admin/CarManagementClient';

export const dynamic = 'force-dynamic';

export default async function AraclarPage() {
  const admin = await getAdminUser();
  if (!admin) redirect('/admin/login');
  if (!hasRole(admin, 'superadmin', 'admin')) redirect('/admin');

  const [cars, offices] = await Promise.all([
    fetchAdminCars(),
    fetchAdminOffices(),
  ]);

  return (
    <AdminShell adminName={`${admin.firstName || ''} ${admin.lastName || ''}`.trim()} adminRole={admin.role}>
      <CarManagementClient cars={cars || []} offices={offices || []} />
    </AdminShell>
  );
}
