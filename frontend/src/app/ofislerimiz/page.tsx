import type { Metadata } from 'next';
import OfficesShowcase from '@/components/OfficesShowcase';

export const dynamic = 'force-dynamic';

const INTERNAL_API_URL = process.env.INTERNAL_API_URL || 'http://backend:1337';

export const metadata: Metadata = {
  title: 'Ofislerimiz | Example',
  description: 'Example kiralama ofislerini keşfedin. Adres, çalışma saatleri ve konum bilgileri ile tüm şubelerimiz.',
};

async function getActiveOffices() {
  try {
    const res = await fetch(
      `${INTERNAL_API_URL}/api/offices?filters[isActive][$eq]=true`,
      { cache: 'no-store' }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data?.data || [];
  } catch {
    return [];
  }
}

export default async function OfislerimizPage() {
  const offices = await getActiveOffices();

  return (
    <main className="min-h-screen relative">
      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] max-w-3xl h-[400px] bg-primary/8 blur-[180px] rounded-full pointer-events-none z-0" />

      <OfficesShowcase offices={offices} />
    </main>
  );
}
