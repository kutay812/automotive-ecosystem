'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

const typeIcons: Record<string, string> = {
  youtube: '▶️',
  instagram: '📸',
  facebook: '📘',
  mp4: '🎬',
};

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function extractInstagramId(url: string): string | null {
  const match = url.match(/instagram\.com\/(?:reel|p|tv)\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

function MediaEmbed({ item }: { item: any }) {
  const [playing, setPlaying] = useState(false);

  // YouTube
  if (item.mediaType === 'youtube') {
    const videoId = extractYouTubeId(item.mediaUrl);
    if (!videoId) return <div className="aspect-video bg-[#0a0a0a] flex items-center justify-center text-gray-600">Geçersiz YouTube URL</div>;
    
    if (!playing) {
      return (
        <div className="aspect-video relative cursor-pointer group" onClick={() => setPlaying(true)}>
          <img
            src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
            alt={item.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-500 flex items-center justify-center">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center shadow-2xl shadow-primary/20 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-7 h-7 text-black ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="aspect-video">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
          className="w-full h-full" frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  // Instagram
  if (item.mediaType === 'instagram') {
    const postId = extractInstagramId(item.mediaUrl);
    return (
      <div className="aspect-video">
        <iframe
          src={`https://www.instagram.com/reel/${postId}/embed/`}
          className="w-full h-full border-0" frameBorder="0"
          allowFullScreen scrolling="no"
        />
      </div>
    );
  }

  // Facebook
  if (item.mediaType === 'facebook') {
    const encodedUrl = encodeURIComponent(item.mediaUrl);
    return (
      <div className="aspect-video">
        <iframe
          src={`https://www.facebook.com/plugins/video.php?href=${encodedUrl}&show_text=false&width=560`}
          className="w-full h-full border-0" frameBorder="0"
          allowFullScreen allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
        />
      </div>
    );
  }

  // MP4
  if (item.mediaType === 'mp4') {
    return (
      <div className="aspect-video">
        <video
          src={item.mediaUrl}
          controls playsInline preload="metadata"
          poster={item.thumbnailUrl || undefined}
          className="w-full h-full object-cover bg-black"
        />
      </div>
    );
  }

  return null;
}

export default function HomepageShowcase({ media }: { media: any[] }) {
  if (!media || media.length === 0) return null;

  return (
    <section className="py-28 px-6 relative z-10">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 text-xs font-bold text-primary mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Medya
          </span>
          <h2 className="text-4xl md:text-5xl font-[family-name:var(--font-outfit)] font-black tracking-tight mb-4">Medya Vitrini</h2>
          <p className="text-gray-500 max-w-2xl mx-auto text-lg">
            İşlerimizden seçmeler ve sosyal medya içeriklerimiz.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {media.map((item: any, index: number) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              whileHover={{ y: -6 }}
              className="glass-card rounded-2xl overflow-hidden group"
            >
              {/* Medya Embed */}
              <div className="overflow-hidden">
                <MediaEmbed item={item} />
              </div>

              {/* Bilgi */}
              {(item.title || item.description) && (
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm">{typeIcons[item.mediaType] || '🎬'}</span>
                    {item.title && <h3 className="font-[family-name:var(--font-outfit)] font-bold text-sm text-white group-hover:text-primary transition-colors duration-300">{item.title}</h3>}
                  </div>
                  {item.description && (
                    <p className="text-xs text-gray-500 leading-relaxed">{item.description}</p>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
