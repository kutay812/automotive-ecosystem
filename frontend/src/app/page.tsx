import Hero from '@/components/Hero';
import Services from '@/components/Services';
import HomepageShowcase from '@/components/HomepageShowcase';

const INTERNAL_API_URL = process.env.INTERNAL_API_URL || 'http://backend:1337';

async function getHomepageMedia() {
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

export default async function Home() {
  return (
    <main className="min-h-screen bg-transparent relative">
      {/* Özel Ana Sayfa Işıklandırması (Glow) */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[80%] max-w-4xl h-[400px] bg-primary/20 blur-[150px] rounded-full pointer-events-none z-[-1]" />
      
      <Hero />
      <Services />
    </main>
  );
}
