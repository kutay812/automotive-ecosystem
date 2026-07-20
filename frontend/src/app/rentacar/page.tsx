import { getCars, getOffices } from '@/lib/api';
import RentCarList from '@/components/RentCarList';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Araç Kiralama | Example",
  description: "Example Rent A Car ile lüks ve konforlu sürüş deneyimi. En yeni modelleri en uygun fiyatlarla kiralayın.",
};

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://127.0.0.1:1337';

export const dynamic = 'force-dynamic';

export default async function RentACarHome() {
  const [officesResponse, rentalsResponse, user] = await Promise.all([
    getOffices(),
    import('@/lib/api').then(m => m.getActiveRentals()),
    import('@/lib/session').then(m => m.getUser())
  ]);

  const offices = officesResponse?.data || [];
  const activeRentals = rentalsResponse?.data || [];

  // Fetch cars filtered by first office (SSR initial load)
  const firstOfficeName = offices[0]?.name;
  const carsResponse = await getCars(firstOfficeName);
  const cars = carsResponse?.data || [];

  // Generate today string for date inputs (Turkey UTC+3 adjustment)
  const todayDate = new Date();
  todayDate.setHours(todayDate.getHours() + 3);
  const todayStr = todayDate.toISOString().split('T')[0];

  return (
    <main className="min-h-screen pt-28 px-6 relative z-10 w-full max-w-7xl mx-auto pb-24">
      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-[400px] bg-primary/8 blur-[180px] rounded-full pointer-events-none z-0" />
      
      {/* Header */}
      <div className="mb-14 relative">
        <span className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 text-xs font-bold text-primary mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          Rent A Car
        </span>
        <h1 className="text-4xl md:text-5xl font-[family-name:var(--font-outfit)] font-black tracking-tight mb-3">Araç Kiralama</h1>
        <p className="text-lg text-gray-500">Example standartlarında eşsiz bir sürüş deneyimi keşfedin.</p>
      </div>

      <RentCarList
        cars={cars}
        offices={offices}
        activeRentals={activeRentals}
        user={user}
        strapiUrl={STRAPI_URL}
      />
    </main>
  );
}
