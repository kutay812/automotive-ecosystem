import { getCars } from '@/lib/api';
import RentCarList from '@/components/RentCarList';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Araç Kiralama | VisionArc",
  description: "VisionArc Rent A Car ile lüks ve konforlu sürüş deneyimi. En yeni modelleri en uygun fiyatlarla kiralayın.",
};

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://127.0.0.1:1337';

export const dynamic = 'force-dynamic';

export default async function RentACarHome() {
  const [carsResponse, officesResponse, rentalsResponse, user] = await Promise.all([
    getCars(),
    import('@/lib/api').then(m => m.getOffices()),
    import('@/lib/api').then(m => m.getActiveRentals()),
    import('@/lib/session').then(m => m.getUser())
  ]);
  
  const cars = carsResponse?.data || [];
  const offices = officesResponse?.data || [];
  const activeRentals = rentalsResponse?.data || [];

  // Generate today string for date inputs (Turkey UTC+3 adjustment)
  const todayDate = new Date();
  todayDate.setHours(todayDate.getHours() + 3);
  const todayStr = todayDate.toISOString().split('T')[0];

  return (
    <main className="min-h-screen pt-24 px-6 relative z-10 w-full max-w-7xl mx-auto pb-24">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Araç Kiralama</h1>
        <p className="text-xl text-gray-400">VisionArc standartlarında eşsiz bir sürüş deneyimi keşfedin.</p>
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
