import { getAdminUser } from '@/lib/admin-session';
import { redirect } from 'next/navigation';
import { fetchAdminCars } from '@/app/actions/admin';
import AdminShell from '@/components/admin/AdminShell';
import CarManagementClient from '@/components/admin/CarManagementClient';

export default async function AraclarPage() {
  const admin = await getAdminUser();
  if (!admin) redirect('/yonetim/giris');

  const cars = await fetchAdminCars();

  return (
    <AdminShell adminName={`${admin.firstname || ''} ${admin.lastname || ''}`.trim()}>
      <CarManagementClient cars={cars || []} />
    </AdminShell>
  );
}
