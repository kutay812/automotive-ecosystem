import Hero from '@/components/Hero';
import Services from '@/components/Services';

export default function Home() {
  return (
    <main className="min-h-screen bg-transparent relative">
      {/* Özel Ana Sayfa Işıklandırması (Glow) */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[80%] max-w-4xl h-[400px] bg-primary/20 blur-[150px] rounded-full pointer-events-none z-[-1]" />
      
      <Hero />
      <Services />
    </main>
  );
}
