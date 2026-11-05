import { requireAdminPage } from '@/lib/admin-session';
import { fetchSupportTickets } from '@/app/actions/admin';
import AdminShell from '@/components/admin/AdminShell';
import SupportManagementClient from '@/components/admin/SupportManagementClient';

export default async function AdminSupportPage() {
  const admin = await requireAdminPage('superadmin', 'admin');

  const tickets = await fetchSupportTickets();

  return (
    <AdminShell adminName={`${admin.firstName || ''} ${admin.lastName || ''}`.trim()} adminRole={admin.role}>
      <SupportManagementClient tickets={tickets} />
    </AdminShell>
  );
}
