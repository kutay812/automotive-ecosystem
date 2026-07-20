'use client';

import Link from 'next/link';
import { getMediaUrl } from '@/lib/api';

interface Project {
  id: number;
  title: string;
  description?: string;
  category?: string;
  mediaType: string;
  mediaUrl: string;
  thumbnailUrl?: string;
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function getProjectThumbnail(project: Project): string | null {
  if (project.mediaType === 'youtube') {
    const id = extractYouTubeId(project.mediaUrl);
    if (id) return `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
  }
  if (project.mediaType === 'image' && project.mediaUrl) return getMediaUrl(project.mediaUrl);
  if (project.thumbnailUrl) return getMediaUrl(project.thumbnailUrl);
  return null;
}

export default function HomepageProjects({ projects }: { projects: Project[] }) {
  if (!projects || projects.length === 0) return null;

  const preview = projects.slice(0, 3);

  return (
    <section className="w-full bg-surface py-16">
      <div className="max-w-[1280px] mx-auto px-6">
        {/* Section Header */}
        <div className="flex justify-between items-end mb-8 border-b border-outline-variant pb-4">
          <div>
            <h2 className="text-headline-md text-primary">Projelerimiz</h2>
            <p className="text-body-md text-on-surface-variant mt-1">Gerçekleştirdiğimiz çalışmalar ve başarı hikayelerimiz.</p>
          </div>
          <Link
            href="/projelerimiz"
            className="text-label-md text-secondary hover:text-secondary-container transition-colors hidden md:flex items-center"
          >
            Tümünü Gör <span className="material-symbols-outlined ml-1 text-[18px]">arrow_forward</span>
          </Link>
        </div>

        {/* Project Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {preview.map((project) => {
            const thumbnail = getProjectThumbnail(project);
            return (
              <Link key={project.id} href="/projelerimiz" className="block">
                <div className="card group h-full flex flex-col">
                  {/* Media Preview */}
                  <div className="relative aspect-video overflow-hidden bg-surface-container">
                    {thumbnail ? (
                      <img
                        src={thumbnail}
                        alt={project.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-outline text-[48px]">movie</span>
                      </div>
                    )}
                    {/* Category badge */}
                    {project.category && (
                      <span className="absolute top-3 left-3 chip bg-surface-variant text-on-surface-variant border border-outline-variant">
                        {project.category}
                      </span>
                    )}
                    {/* Play indicator */}
                    {(project.mediaType === 'youtube' || project.mediaType === 'mp4') && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center shadow-lg opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300">
                          <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-5 flex flex-col flex-grow">
                    <h3 className="text-label-md text-primary mb-2 group-hover:text-secondary transition-colors duration-300 line-clamp-1">
                      {project.title}
                    </h3>
                    {project.description && (
                      <p className="text-caption text-on-surface-variant leading-relaxed line-clamp-2 flex-grow">
                        {project.description}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 mt-3 text-secondary text-label-md">
                      Detayları Gör
                      <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform duration-300">arrow_forward</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Mobile CTA */}
        <div className="mt-8 text-center md:hidden">
          <Link
            href="/projelerimiz"
            className="text-label-md text-secondary hover:text-secondary-container transition-colors inline-flex items-center"
          >
            Tüm Projeleri Gör <span className="material-symbols-outlined ml-1 text-[18px]">arrow_forward</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
