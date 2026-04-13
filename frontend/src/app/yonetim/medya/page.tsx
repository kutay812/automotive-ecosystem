import { getAdminUser } from '@/lib/admin-session';
import { redirect } from 'next/navigation';
import { fetchAdminMedia } from '@/app/actions/admin';
import AdminShell from '@/components/admin/AdminShell';
import MediaManagementClient from '@/components/admin/MediaManagementClient';

export default async function MedyaPage() {
  const admin = await getAdminUser();
  if (!admin) redirect('/yonetim/giris');

  const media = await fetchAdminMedia();

  return (
    <AdminShell adminName={`${admin.firstname || ''} ${admin.lastname || ''}`.trim()}>
      <MediaManagementClient media={media || []} />
    </AdminShell>
  );
}
