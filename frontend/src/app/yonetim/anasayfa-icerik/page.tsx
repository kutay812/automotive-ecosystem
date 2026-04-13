import { getAdminUser } from '@/lib/admin-session';
import { redirect } from 'next/navigation';
import { fetchHomepageMedia } from '@/app/actions/admin';
import AdminShell from '@/components/admin/AdminShell';
import HomepageMediaClient from '@/components/admin/HomepageMediaClient';

export default async function AnasayfaIcerikPage() {
  const admin = await getAdminUser();
  if (!admin) redirect('/yonetim/giris');

  const media = await fetchHomepageMedia();

  return (
    <AdminShell adminName={`${admin.firstname || ''} ${admin.lastname || ''}`.trim()}>
      <HomepageMediaClient media={media || []} />
    </AdminShell>
  );
}
