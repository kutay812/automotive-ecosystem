import { getAdminUser, hasRole } from '@/lib/admin-session';
import { redirect } from 'next/navigation';
import { fetchHomepageMedia } from '@/app/actions/admin';
import AdminShell from '@/components/admin/AdminShell';
import HomepageMediaClient from '@/components/admin/HomepageMediaClient';

export default async function AnasayfaIcerikPage() {
  const admin = await getAdminUser();
  if (!admin) redirect('/admin/login');
  if (!hasRole(admin, 'superadmin', 'admin', 'editor')) redirect('/admin');

  const media = await fetchHomepageMedia();

  return (
    <AdminShell adminName={`${admin.firstName || ''} ${admin.lastName || ''}`.trim()} adminRole={admin.role}>
      <HomepageMediaClient media={media || []} />
    </AdminShell>
  );
}
