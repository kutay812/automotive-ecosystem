import { getAdminUser, hasRole } from '@/lib/admin-session';
import { redirect } from 'next/navigation';
import { fetchSupportTickets } from '@/app/actions/admin';
import AdminShell from '@/components/admin/AdminShell';
import SupportManagementClient from '@/components/admin/SupportManagementClient';

export default async function AdminSupportPage() {
  const admin = await getAdminUser();
  if (!admin) redirect('/admin/login');
  if (!hasRole(admin, 'superadmin', 'admin')) redirect('/admin');

  const tickets = await fetchSupportTickets();

  return (
    <AdminShell adminName={`${admin.firstName || ''} ${admin.lastName || ''}`.trim()} adminRole={admin.role}>
      <SupportManagementClient tickets={tickets} />
    </AdminShell>
  );
}
