import { getAdminUser, hasRole } from '@/lib/admin-session';
import { redirect } from 'next/navigation';
import { fetchFinanceReport } from '@/app/actions/admin';
import AdminShell from '@/components/admin/AdminShell';
import FinanceReportClient from '@/components/admin/FinanceReportClient';

export const dynamic = 'force-dynamic';

export default async function MuhasebePage() {
  const admin = await getAdminUser();
  if (!admin) redirect('/admin/login');
  if (!hasRole(admin, 'superadmin', 'admin')) redirect('/admin');

  const initialReport = await fetchFinanceReport('monthly');

  return (
    <AdminShell adminName={`${admin.firstName || ''} ${admin.lastName || ''}`.trim()} adminRole={admin.role}>
      <FinanceReportClient initialReport={initialReport} />
    </AdminShell>
  );
}
