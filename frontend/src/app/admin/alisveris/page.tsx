import { requireAdminPage } from '@/lib/admin-session';
import { fetchShopItems, fetchShopSettings } from '@/app/actions/admin';
import AdminShell from '@/components/admin/AdminShell';
import ShopManagementClient from '@/components/admin/ShopManagementClient';

export const dynamic = 'force-dynamic';

export default async function AlisverisPage() {
  const admin = await requireAdminPage('superadmin', 'admin');

  const items = await fetchShopItems();
  const settings = await fetchShopSettings();

  return (
    <AdminShell adminName={`${admin.firstName || ''} ${admin.lastName || ''}`.trim()} adminRole={admin.role}>
      <ShopManagementClient initialItems={items} initialSettings={settings} />
    </AdminShell>
  );
}
