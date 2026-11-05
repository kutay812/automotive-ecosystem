import { requireAdminPage } from '@/lib/admin-session';
import { fetchHomepageMedia } from '@/app/actions/admin';
import AdminShell from '@/components/admin/AdminShell';
import HomepageMediaClient from '@/components/admin/HomepageMediaClient';

export default async function AnasayfaIcerikPage() {
  const admin = await requireAdminPage('superadmin', 'admin', 'editor');

  const media = await fetchHomepageMedia();

  return (
    <AdminShell adminName={`${admin.firstName || ''} ${admin.lastName || ''}`.trim()} adminRole={admin.role}>
      <HomepageMediaClient media={media || []} />
    </AdminShell>
  );
}
