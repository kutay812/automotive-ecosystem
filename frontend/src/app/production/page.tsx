import { getProjects } from '@/lib/api';
import VideoPlayer from '@/components/VideoPlayer';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

export const revalidate = 60; // SSR with ISR

export default async function ProductionHome() {
  const response = await getProjects();
  const projects = response?.data || [];

  return (
    <main className="min-h-screen pt-24 px-6 relative z-10 w-full max-w-7xl mx-auto">
      <div className="text-center mb-16 mt-8">
        <h1 className="text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-accent to-white">
          VisionArc Medya ve Prodüksiyon
        </h1>
        <p className="text-xl text-gray-400">Markalar için eşsiz görsel hikayeler oluşturuyoruz.</p>
      </div>

      {projects.length === 0 ? (
        <div className="text-center text-gray-500 py-20">
          <p>Şu anda gösterilecek bir prodüksiyon projesi bulunmuyor.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-12">
          {projects.map((projItem: any, index: number) => {
            const project = projItem.attributes || projItem;
            const desc = typeof project.description === 'string' ? project.description : 'Detaylar proje kapsamında saklanmaktadır.';
            
            // Determine video source: native Strapi upload vs external URL (YouTube/FB/IG)
            const uploadedFileUrl = project.videoFile?.url || project.videoFile?.data?.attributes?.url;
            const finalVideoUrl = uploadedFileUrl 
              ? (uploadedFileUrl.startsWith('http') ? uploadedFileUrl : `${STRAPI_URL}${uploadedFileUrl}`)
              : project.videoUrl;

            // Dikey (Reels) videolar için CSS Container'ı telefona yakışır şekilde daraltıp uzatıyoruz
            const isVerticalVideo = finalVideoUrl && (finalVideoUrl.includes('/reel/') || finalVideoUrl.includes('/reels/') || finalVideoUrl.includes('instagram.com/p/') || finalVideoUrl.includes('instagram.com/reel/'));
            const wrapperClasses = isVerticalVideo 
              ? "w-full md:w-[320px] aspect-[9/16] bg-transparent rounded-xl overflow-hidden relative shrink-0"
              : "w-full md:w-1/2 aspect-video bg-transparent rounded-xl overflow-hidden relative shrink-0";

            return (
              <div 
                key={projItem.id || projItem.documentId} 
                className={`flex flex-col ${index % 2 !== 0 ? 'md:flex-row-reverse' : 'md:flex-row'} gap-8 md:gap-16 items-center w-full`}
              >
                <div className={wrapperClasses}>
                  {finalVideoUrl ? (
                    <VideoPlayer url={finalVideoUrl} />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-600">
                      <span className="text-5xl mb-2">🎬</span>
                      <span>Video yüklenmedi</span>
                    </div>
                  )}
                </div>
                
                <div className="glass p-8 md:p-10 rounded-3xl border border-white/5 w-full md:w-auto flex-1 flex flex-col justify-center h-fit">
                  <span className="text-accent text-sm font-bold tracking-widest uppercase mb-2">
                    {project.client || 'Bağımsız Proje'}
                  </span>
                  <h2 className="text-3xl font-bold mb-4">{project.title}</h2>
                  <p className="text-gray-400 mb-6 leading-relaxed">
                    {desc}
                  </p>
                  {project.date && (
                    <span className="text-sm border border-white/10 w-fit px-4 py-1.5 rounded-full text-gray-500">
                      Proje Tarihi: {new Date(project.date).toLocaleDateString('tr-TR')}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
