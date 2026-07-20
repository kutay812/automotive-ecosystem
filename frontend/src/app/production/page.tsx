import VideoPlayer from '@/components/VideoPlayer';
import type { Metadata } from 'next';

const INTERNAL_API_URL = process.env.INTERNAL_API_URL || 'http://backend:1337';

export const metadata: Metadata = {
  title: "Medya ve Prodüksiyon | Example",
  description: "Example Medya ve Prodüksiyon ile markanız için eşsiz görsel hikayeler ve profesyonel video içerikleri oluşturun.",
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
    <main className="min-h-screen pt-28 px-6 relative z-10 w-full max-w-7xl mx-auto">
      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-[400px] bg-primary/8 blur-[180px] rounded-full pointer-events-none z-[-1]" />
      
      <div className="text-center mb-16 mt-8">
        <span className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-5 py-2 text-xs font-bold text-primary mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          Prodüksiyon
        </span>
        <h1 className="text-5xl md:text-6xl font-[family-name:var(--font-outfit)] font-black tracking-tight mb-4">
          Example <span className="text-gradient-orange">Medya</span>
        </h1>
        <p className="text-lg text-gray-500 max-w-xl mx-auto">Markalar için eşsiz görsel hikayeler oluşturuyoruz.</p>
      </div>

      {media.length === 0 ? (
        <div className="text-center text-gray-500 py-20 glass-card rounded-2xl">
          <span className="text-4xl mb-4 block">🎬</span>
          <p className="font-bold text-white">Şu anda gösterilecek bir prodüksiyon projesi bulunmuyor.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-20 pb-20">
          {media.map((item: any, index: number) => {
            const desc = item.description || 'Detaylar proje kapsamında saklanmaktadır.';
            
            // Dikey (Reels) videolar için CSS Container'ı telefona yakışır şekilde daraltıp uzatıyoruz
            const isVerticalReel = item.mediaUrl && (item.mediaUrl.includes('/reel/') || item.mediaUrl.includes('/reels/') || item.mediaUrl.includes('instagram.com/p/') || item.mediaUrl.includes('instagram.com/reel/'));
            
            const wrapperClasses = isVerticalReel 
              ? "w-full md:w-[320px] aspect-[9/16] bg-[#0a0a0a] rounded-2xl overflow-hidden relative shrink-0 shadow-2xl border border-white/5"
              : "w-full md:w-1/2 aspect-video bg-[#0a0a0a] rounded-2xl overflow-hidden relative shrink-0 shadow-2xl border border-white/5";

            return (
              <div 
                key={item.documentId || item.id} 
                className={`flex flex-col ${index % 2 !== 0 ? 'md:flex-row-reverse' : 'md:flex-row'} gap-8 md:gap-16 items-center w-full`}
              >
                <div className={wrapperClasses}>
                  <VideoPlayer url={item.mediaUrl} />
                </div>
                
                <div className="glass-card p-8 md:p-12 rounded-2xl w-full flex-1 flex flex-col justify-center h-fit relative overflow-hidden group">

                  
                  <span className="text-primary text-xs font-bold tracking-widest uppercase mb-3">
                    ÖNE ÇIKAN PROJE
                  </span>
                  <h2 className="text-3xl md:text-4xl font-[family-name:var(--font-outfit)] font-bold mb-6 text-white group-hover:text-primary transition-colors duration-300">{item.title || 'İsimsiz Proje'}</h2>
                  <p className="text-gray-500 text-lg mb-8 leading-relaxed">
                    {desc}
                  </p>
                  
                  <div className="flex items-center gap-4">
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
