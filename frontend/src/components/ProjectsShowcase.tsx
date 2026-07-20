'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useCallback, useEffect } from 'react';
import { getMediaUrl } from '@/lib/api';

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function MediaPlayer({ project, autoplay = false, className = '' }: { project: any; autoplay?: boolean; className?: string }) {
  const [playing, setPlaying] = useState(autoplay);

  if (project.mediaType === 'youtube') {
    const videoId = extractYouTubeId(project.mediaUrl);
    if (!videoId) return <div className={`bg-surface-container flex items-center justify-center text-on-surface-variant text-sm ${className}`}>Geçersiz URL</div>;

    if (!playing) {
      return (
        <div className={`relative cursor-pointer group/play ${className}`} onClick={() => setPlaying(true)}>
          <img
            src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
            alt={project.title}
            className="w-full h-full object-cover mix-blend-multiply"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/10 group-hover/play:bg-black/20 transition-colors duration-500 flex items-center justify-center">
            <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center shadow-lg group-hover/play:scale-110 transition-transform duration-300">
              <span className="material-symbols-outlined text-[32px] text-white">play_arrow</span>
            </div>
          </div>
        </div>
      );
    }
    return (
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
        className={className} frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }

  if (project.mediaType === 'mp4') {
    return (
      <video
        src={getMediaUrl(project.mediaUrl)}
        controls playsInline preload="metadata"
        poster={project.thumbnailUrl ? getMediaUrl(project.thumbnailUrl) : undefined}
        className={`object-cover ${className}`}
      />
    );
  }

  // Image
  if (project.mediaUrl) {
    return (
      <img
        src={getMediaUrl(project.mediaUrl)}
        alt={project.title}
        className={`object-cover mix-blend-multiply ${className}`}
        loading="lazy"
      />
    );
  }

  return (
    <div className={`bg-surface-container flex items-center justify-center ${className}`}>
      <span className="material-symbols-outlined text-[64px] text-outline">movie</span>
    </div>
  );
}

function ProjectCard({ project, index, onOpenDetail }: { project: any; index: number; onOpenDetail: (p: any) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08, duration: 0.5 }}
      whileHover={{ y: -6 }}
      className="card flex flex-col group cursor-pointer"
      onClick={() => onOpenDetail(project)}
    >
      {/* Medya */}
      <div className="aspect-video overflow-hidden relative bg-surface-container rounded-t-xl border-b border-outline-variant">
        <MediaPlayer project={project} className="w-full h-full group-hover:scale-105 transition-transform duration-700" />
        {/* Category badge */}
        <div className="absolute top-3 left-3 z-10">
          <span className="chip border bg-surface text-on-surface-variant border-outline-variant">
            {project.category}
          </span>
        </div>
        {/* Media type badge */}
        <div className="absolute top-3 right-3 z-10">
          <span className="chip border bg-secondary-container text-on-secondary-container border-outline-variant flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">
              {project.mediaType === 'youtube' || project.mediaType === 'mp4' ? 'play_circle' : 'image'}
            </span>
            {project.mediaType === 'youtube' ? 'Video' : project.mediaType === 'mp4' ? 'Video' : 'Görsel'}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-5 flex-grow flex flex-col bg-surface rounded-b-xl">
        <h3 className="text-headline-sm text-primary group-hover:text-secondary transition-colors duration-300 mb-2">
          {project.title}
        </h3>
        {project.description && (
          <p className="text-caption text-on-surface-variant leading-relaxed line-clamp-2 mb-4 flex-grow">{project.description}</p>
        )}
        <div className="mt-auto">
          <button
            className="inline-flex items-center gap-1 text-label-md text-secondary hover:text-secondary-container transition-colors duration-300 group/btn"
            onClick={(e) => { e.stopPropagation(); onOpenDetail(project); }}
          >
            Detaylara Bak
            <span className="material-symbols-outlined text-[16px] group-hover/btn:translate-x-1 transition-transform duration-300">arrow_forward</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function ProjectDetailModal({ project, onClose }: { project: any; onClose: () => void }) {
  // Close on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-8"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="relative w-full max-w-4xl max-h-[90vh] bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-[0_4px_40px_rgba(0,0,0,0.15)] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 w-10 h-10 bg-surface/80 backdrop-blur-md border border-outline-variant rounded-full flex items-center justify-center text-on-surface hover:text-primary transition-all duration-300 shadow-sm"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        {/* Scrollable content */}
        <div className="overflow-y-auto custom-scrollbar">
          {/* Media Section */}
          <div className="aspect-video w-full bg-surface-container relative border-b border-outline-variant">
            <MediaPlayer project={project} autoplay={false} className="w-full h-full object-contain mix-blend-multiply" />
          </div>

          {/* Info Section */}
          <div className="p-6 md:p-8 space-y-4 bg-surface">
            {/* Category + Type badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip bg-primary-container text-on-primary-container border-outline-variant">
                {project.category}
              </span>
              <span className="chip bg-surface border-outline-variant text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">
                  {project.mediaType === 'youtube' || project.mediaType === 'mp4' ? 'play_circle' : 'image'}
                </span>
                {project.mediaType === 'youtube' ? 'YouTube Video' : project.mediaType === 'mp4' ? 'MP4 Video' : 'Görsel'}
              </span>
            </div>

            {/* Title */}
            <h2 className="text-display-sm text-primary font-black">
              {project.title}
            </h2>

            {/* Full Description */}
            {project.description && (
              <div className="space-y-3 pt-4 border-t border-outline-variant">
                <p className="text-on-surface-variant text-body-lg leading-relaxed whitespace-pre-line">
                  {project.description}
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function ProjectsShowcase({ projects }: { projects: any[] }) {
  const [activeCategory, setActiveCategory] = useState('Tümü');
  const [selectedProject, setSelectedProject] = useState<any | null>(null);

  const categories = ['Tümü', ...Array.from(new Set(projects.map(p => p.category).filter(Boolean)))];
  const filtered = activeCategory === 'Tümü' ? projects : projects.filter(p => p.category === activeCategory);

  const handleOpenDetail = useCallback((project: any) => {
    setSelectedProject(project);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedProject(null);
  }, []);

  if (!projects || projects.length === 0) {
    return (
      <div className="text-center py-20 card">
        <span className="material-symbols-outlined text-[64px] text-outline mb-4">movie</span>
        <p className="text-headline-sm font-bold text-primary mb-2">Henüz proje eklenmemiş.</p>
        <p className="text-body-md text-on-surface-variant">Yakında projelerimizi burada paylaşacağız.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 w-full max-w-[1280px] mx-auto">
      {/* Category Filter */}
      {categories.length > 2 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap gap-2 justify-center"
        >
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-6 py-2.5 rounded-full text-label-md transition-all duration-300 border ${
                activeCategory === cat
                  ? 'bg-primary text-on-primary border-primary font-bold shadow-md'
                  : 'bg-surface text-on-surface border-outline-variant hover:bg-surface-container hover:text-primary'
              }`}
            >
              {cat}
            </button>
          ))}
        </motion.div>
      )}

      {/* Project Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((project, index) => (
          <ProjectCard key={project.id} project={project} index={index} onOpenDetail={handleOpenDetail} />
        ))}
      </div>

      {filtered.length === 0 && activeCategory !== 'Tümü' && (
        <p className="text-center text-on-surface-variant py-10 card">Bu kategoride henüz proje bulunmuyor.</p>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedProject && (
          <ProjectDetailModal project={selectedProject} onClose={handleCloseDetail} />
        )}
      </AnimatePresence>
    </div>
  );
}
