import { getAdminUser, hasRole } from '@/lib/admin-session';
import { redirect } from 'next/navigation';
import { fetchAdminProjects } from '@/app/actions/admin';
import AdminShell from '@/components/admin/AdminShell';
import ProjectManagementClient from '@/components/admin/ProjectManagementClient';

export default async function ProjelerimizAdminPage() {
  const admin = await getAdminUser();
  if (!admin) redirect('/admin/login');
  if (!hasRole(admin, 'superadmin', 'admin', 'editor')) redirect('/admin');

  const projects = await fetchAdminProjects();

  return (
    <AdminShell adminName={`${admin.firstName || ''} ${admin.lastName || ''}`.trim()} adminRole={admin.role}>
      <ProjectManagementClient projects={projects || []} />
    </AdminShell>
  );
}
