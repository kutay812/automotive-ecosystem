import { requireAdminPage } from '@/lib/admin-session';
import { fetchAdminProjects } from '@/app/actions/admin';
import AdminShell from '@/components/admin/AdminShell';
import ProjectManagementClient from '@/components/admin/ProjectManagementClient';

export default async function ProjelerimizAdminPage() {
  const admin = await requireAdminPage('superadmin', 'admin', 'editor');

  const projects = await fetchAdminProjects();

  return (
    <AdminShell adminName={`${admin.firstName || ''} ${admin.lastName || ''}`.trim()} adminRole={admin.role}>
      <ProjectManagementClient projects={projects || []} />
    </AdminShell>
  );
}
