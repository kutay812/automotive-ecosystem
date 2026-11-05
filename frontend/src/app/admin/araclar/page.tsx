import { requireAdminPage } from '@/lib/admin-session';
import { fetchAdminCars, fetchAdminOffices } from '@/app/actions/admin';
import AdminShell from '@/components/admin/AdminShell';
import CarManagementClient from '@/components/admin/CarManagementClient';

export const dynamic = 'force-dynamic';

export default async function AraclarPage() {
  const admin = await requireAdminPage('superadmin', 'admin');

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
