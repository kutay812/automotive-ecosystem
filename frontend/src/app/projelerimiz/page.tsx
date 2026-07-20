import { fetchPublicProjects } from '@/app/actions/admin';
import ProjectsShowcase from '@/components/ProjectsShowcase';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Projelerimiz | Example',
  description: 'Example projelerini keşfedin — araç kiralama, medya prodüksiyon ve kurumsal çalışmalarımız.',
};

export default async function ProjelerimizPage() {
  const projects = await fetchPublicProjects();

  return (
    <div className="min-h-screen relative">
      {/* Ambient glow */}
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-[180px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 pt-32 pb-20 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 text-xs font-bold text-primary mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Portfolyo
          </span>
          <h1 className="text-4xl md:text-6xl font-[family-name:var(--font-outfit)] font-black tracking-tight mb-4">
            Projelerimiz
          </h1>
          <p className="text-gray-500 max-w-2xl mx-auto text-lg">
            Gerçekleştirdiğimiz çalışmalar ve başarı hikayelerimiz.
          </p>
        </div>

        <ProjectsShowcase projects={projects} />
      </div>
    </div>
  );
}
