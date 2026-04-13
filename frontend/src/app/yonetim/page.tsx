import { getAdminUser } from '@/lib/admin-session';
import { redirect } from 'next/navigation';
import { fetchAdminStats, fetchAdminRentals, fetchAdminUsers, fetchAdminMedia } from '@/app/actions/admin';
import AdminShell from '@/components/admin/AdminShell';
import AdminDashboardClient from '@/components/admin/AdminDashboardClient';

export default async function AdminDashboard() {
  const admin = await getAdminUser();
  if (!admin) redirect('/yonetim/giris');

  const [stats, rentals, users, media] = await Promise.all([
    fetchAdminStats(),
    fetchAdminRentals(),
    fetchAdminUsers(),
    fetchAdminMedia(),
  ]);

  const recentRentals = (rentals || []).slice(0, 10);
  const enrichedStats = { ...stats, totalUsers: (users || []).length, totalMedia: (media || []).length };

  return (
    <AdminShell adminName={`${admin.firstname || ''} ${admin.lastname || ''}`.trim()}>
      <AdminDashboardClient stats={enrichedStats} recentRentals={recentRentals} />
    </AdminShell>
  );
}

