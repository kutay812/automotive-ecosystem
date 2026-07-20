import { getAdminUser, hasRole } from '@/lib/admin-session';
import { redirect } from 'next/navigation';
import { fetchAdminMedia } from '@/app/actions/admin';
import AdminShell from '@/components/admin/AdminShell';
import MediaManagementClient from '@/components/admin/MediaManagementClient';

export default async function MedyaPage() {
  const admin = await getAdminUser();
  if (!admin) redirect('/admin/login');
  if (!hasRole(admin, 'superadmin', 'admin', 'editor')) redirect('/admin');

  const media = await fetchAdminMedia();

  return (
    <AdminShell adminName={`${admin.firstName || ''} ${admin.lastName || ''}`.trim()} adminRole={admin.role}>
      <MediaManagementClient media={media || []} />
    </AdminShell>
  );
}
