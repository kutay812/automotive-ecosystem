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
    if (!videoId) return <div className="aspect-video bg-black/60 flex items-center justify-center text-gray-500">Geçersiz YouTube URL</div>;
    
    if (!playing) {
      return (
        <div className="aspect-video relative cursor-pointer group" onClick={() => setPlaying(true)}>
          <img
            src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
            alt={item.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
              <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
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
    <section className="py-24 px-6 relative z-10">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Medya Vitrini</h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
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
              className="glass rounded-2xl border border-white/5 overflow-hidden group hover:border-white/10 transition-all"
            >
              {/* Medya Embed */}
              <div className="overflow-hidden rounded-t-2xl">
                <MediaEmbed item={item} />
              </div>

              {/* Bilgi */}
              {(item.title || item.description) && (
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm">{typeIcons[item.mediaType] || '🎬'}</span>
                    {item.title && <h3 className="font-bold text-sm">{item.title}</h3>}
                  </div>
                  {item.description && (
                    <p className="text-xs text-gray-400 leading-relaxed">{item.description}</p>
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
