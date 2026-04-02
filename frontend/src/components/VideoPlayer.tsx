'use client';

export default function VideoPlayer({ url }: { url: string }) {
  const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
  const isVimeo = url.includes('vimeo.com');
  const isInstagram = url.includes('instagram.com/p/') || url.includes('instagram.com/reel/');
  const isFacebook = (url.includes('facebook.com') && (url.includes('/videos/') || url.includes('/reel/'))) || url.includes('fb.watch');

  if (isYouTube) {
    let embedId = '';
    if (url.includes('youtube.com/watch?v=')) {
      embedId = url.split('v=')[1].split('&')[0];
    } else if (url.includes('youtu.be/')) {
      embedId = url.split('youtu.be/')[1].split('?')[0];
    }
    
    return (
      <iframe
        className="w-full h-full absolute inset-0 z-50 rounded-xl"
        src={`https://www.youtube.com/embed/${embedId}?rel=0`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      ></iframe>
    );
  }

  if (isVimeo) {
    const embedId = url.split('vimeo.com/')[1].split('?')[0];
    return (
      <iframe
        className="w-full h-full absolute inset-0 z-50 rounded-xl"
        src={`https://player.vimeo.com/video/${embedId}`}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      ></iframe>
    );
  }

  if (isInstagram) {
    let embedUrl = url;
    if (embedUrl.includes('?')) embedUrl = embedUrl.split('?')[0]; // query parametrelerini temizle
    if (!embedUrl.endsWith('/')) embedUrl += '/';
    embedUrl += 'embed';

    return (
      <iframe
        className="w-full h-full absolute inset-0 z-50 rounded-xl"
        src={embedUrl}
        allow="encrypted-media"
      ></iframe>
    );
  }

  if (isFacebook) {
    const embedUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`;
    
    return (
      <iframe
        className="w-full h-full absolute inset-0 z-50 rounded-xl"
        src={embedUrl}
        style={{ border: 'none', overflow: 'hidden' }}
        scrolling="no"
        frameBorder="0"
        allowFullScreen={true}
        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
      ></iframe>
    );
  }

  // Native MP4 Support (Strapi Uploads)
  return (
    <video 
      controls 
      controlsList="nodownload"
      className="w-full h-full absolute inset-0 z-50 rounded-xl object-contain bg-transparent"
      src={url}
      playsInline
    />
  );
}
