import { getAdminUser } from '@/lib/admin-session';
import { redirect } from 'next/navigation';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Giriş sayfası hariç, admin oturumu kontrol et
  return <>{children}</>;
}
