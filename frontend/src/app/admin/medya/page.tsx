import { requireAdminPage } from '@/lib/admin-session';
import { fetchAdminMedia } from '@/app/actions/admin';
import AdminShell from '@/components/admin/AdminShell';
import MediaManagementClient from '@/components/admin/MediaManagementClient';

export default async function MedyaPage() {
  const admin = await requireAdminPage('superadmin', 'admin', 'editor');

  const media = await fetchAdminMedia();

  return (
    <AdminShell adminName={`${admin.firstName || ''} ${admin.lastName || ''}`.trim()} adminRole={admin.role}>
      <MediaManagementClient media={media || []} />
    </AdminShell>
  );
}
