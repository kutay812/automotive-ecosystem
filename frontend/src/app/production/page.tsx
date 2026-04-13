import VideoPlayer from '@/components/VideoPlayer';
import type { Metadata } from 'next';

const INTERNAL_API_URL = process.env.INTERNAL_API_URL || 'http://backend:1337';

export const metadata: Metadata = {
  title: "Medya ve Prodüksiyon | VisionArc",
  description: "VisionArc Medya ve Prodüksiyon ile markanız için eşsiz görsel hikayeler ve profesyonel video içerikleri oluşturun.",
};

async function getProductionMedia() {
  try {
    const res = await fetch(`${INTERNAL_API_URL}/api/homepage-media?active=true`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data?.data || [];
  } catch {
    return [];
  }
}

export default async function ProductionHome() {
  const media = await getProductionMedia();

  return (
    <main className="min-h-screen pt-24 px-6 relative z-10 w-full max-w-7xl mx-auto">
      <div className="absolute top-[-5%] left-1/2 -translate-x-1/2 w-full h-[300px] bg-accent/10 blur-[120px] rounded-full pointer-events-none z-[-1]" />
      
      <div className="text-center mb-16 mt-8">
        <h1 className="text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-accent to-white">
          VisionArc Medya ve Prodüksiyon
        </h1>
        <p className="text-xl text-gray-400">Markalar için eşsiz görsel hikayeler oluşturuyoruz.</p>
      </div>

      {media.length === 0 ? (
        <div className="text-center text-gray-500 py-20 bg-white/[0.02] border border-white/5 rounded-3xl">
          <span className="text-4xl mb-4 block">🎬</span>
          <p>Şu anda gösterilecek bir prodüksiyon projesi bulunmuyor.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-20 pb-20">
          {media.map((item: any, index: number) => {
            const desc = item.description || 'Detaylar proje kapsamında saklanmaktadır.';
            
            // Dikey (Reels) videolar için CSS Container'ı telefona yakışır şekilde daraltıp uzatıyoruz
            const isVerticalReel = item.mediaUrl && (item.mediaUrl.includes('/reel/') || item.mediaUrl.includes('/reels/') || item.mediaUrl.includes('instagram.com/p/') || item.mediaUrl.includes('instagram.com/reel/'));
            
            const wrapperClasses = isVerticalReel 
              ? "w-full md:w-[320px] aspect-[9/16] bg-black/20 rounded-2xl overflow-hidden relative shrink-0 shadow-2xl border border-white/5"
              : "w-full md:w-1/2 aspect-video bg-black/20 rounded-2xl overflow-hidden relative shrink-0 shadow-2xl border border-white/5";

            return (
              <div 
                key={item.documentId || item.id} 
                className={`flex flex-col ${index % 2 !== 0 ? 'md:flex-row-reverse' : 'md:flex-row'} gap-8 md:gap-16 items-center w-full`}
              >
                <div className={wrapperClasses}>
                  <VideoPlayer url={item.mediaUrl} />
                </div>
                
                <div className="glass p-8 md:p-12 rounded-3xl border border-white/10 w-full flex-1 flex flex-col justify-center h-fit relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <span className="text-6xl uppercase font-black">{item.mediaType}</span>
                  </div>
                  
                  <span className="text-accent text-sm font-bold tracking-widest uppercase mb-3">
                    ÖNE ÇIKAN PROJE
                  </span>
                  <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white group-hover:text-accent transition-colors">{item.title || 'İsimsiz Proje'}</h2>
                  <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                    {desc}
                  </p>
                  
                  <div className="flex items-center gap-4">
                     <span className="px-5 py-2 rounded-full bg-white/5 border border-white/10 text-xs text-gray-400">
                        {item.mediaType.toUpperCase()}
                     </span>
                     {item.createdAt && (
                        <span className="text-xs text-gray-600">
                          {new Date(item.createdAt).getFullYear()}
                        </span>
                     )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
