import { getAdminUser, hasRole } from '@/lib/admin-session';
import { redirect } from 'next/navigation';
import { fetchAdminStats, fetchAdminRentals, fetchAdminUsers, fetchAdminMedia } from '@/app/actions/admin';
import AdminShell from '@/components/admin/AdminShell';
import AdminDashboardClient from '@/components/admin/AdminDashboardClient';

export default async function AdminDashboard() {
  const admin = await getAdminUser();
  if (!admin) redirect('/admin/login');
  
  // Dashboard superadmin, admin ve editor erişebilir
  if (!hasRole(admin, 'superadmin', 'admin', 'editor')) {
    redirect('/admin/login');
  }

  const [stats, rentals, users, media] = await Promise.all([
    fetchAdminStats(),
    fetchAdminRentals(),
    fetchAdminUsers(),
    fetchAdminMedia(),
  ]);

  const recentRentals = (rentals || []).slice(0, 10);
  const enrichedStats = { ...stats, totalUsers: (users || []).length, totalMedia: (media || []).length };

  return (
    <AdminShell adminName={`${admin.firstName || ''} ${admin.lastName || ''}`.trim()} adminRole={admin.role}>
      <AdminDashboardClient stats={enrichedStats} recentRentals={recentRentals} />
    </AdminShell>
  );
}
