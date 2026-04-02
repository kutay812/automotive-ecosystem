import { getCars } from '@/lib/api';
import Image from 'next/image';
import Link from 'next/link';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

export const dynamic = 'force-dynamic'; // Auth gereksinimi nedeniyle hep canlı çalışmalı.

export default async function RentACarHome() {
  const [carsResponse, officesResponse, user] = await Promise.all([
    getCars(),
    import('@/lib/api').then(m => m.getOffices()),
    import('@/lib/session').then(m => m.getUser())
  ]);
  
  const cars = carsResponse?.data || [];
  const offices = officesResponse?.data || [];

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

      {/* Search Bar (Dynamic Avis Style) */}
      <div className="glass p-6 md:p-8 rounded-3xl mb-12 flex flex-col lg:flex-row gap-4 items-end border border-white/5 shadow-2xl">
        
        {/* Alış Ofisi */}
        <div className="w-full lg:w-1/5">
          <label className="block text-sm text-gray-400 mb-2">Alış Ofisi</label>
          <select className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary cursor-pointer hover:bg-black/60 transition-colors appearance-none">
            {offices.length === 0 && <option>Ofis bulunamadı</option>}
            {offices.map((officeItem: any) => {
              const office = officeItem.attributes || officeItem;
              return <option key={officeItem.id || officeItem.documentId} value={office.name}>{office.name} - {office.city}</option>
            })}
          </select>
        </div>

        {/* Teslim Ofisi */}
        <div className="w-full lg:w-1/5">
          <label className="block text-sm text-gray-400 mb-2">Teslim Ofisi</label>
          <select className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary cursor-pointer hover:bg-black/60 transition-colors appearance-none">
            {offices.length === 0 && <option>Ofis bulunamadı</option>}
            {offices.map((officeItem: any) => {
              const office = officeItem.attributes || officeItem;
              return <option key={officeItem.id || officeItem.documentId} value={office.name}>{office.name} - {office.city}</option>
            })}
          </select>
        </div>

        {/* Alış Tarihi */}
        <div className="w-full lg:w-1/5">
          <label className="block text-sm text-gray-400 mb-2">Alış Tarihi</label>
          <input 
            type="date" 
            min={todayStr}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary transition-colors hover:bg-black/60 [color-scheme:dark]" 
          />
        </div>

        {/* Teslim Tarihi */}
        <div className="w-full lg:w-1/5">
          <label className="block text-sm text-gray-400 mb-2">Teslim Tarihi</label>
          <input 
            type="date" 
            min={todayStr}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary transition-colors hover:bg-black/60 [color-scheme:dark]" 
          />
        </div>

        {/* Araç Bul Butonu */}
        <div className="w-full lg:w-1/5 flex gap-4">
          <button className="w-full bg-primary text-black font-bold py-3 rounded-xl hover:bg-primary/90 transition-colors text-lg shadow-[0_0_15px_rgba(255,90,0,0.3)] hover:shadow-[0_0_25px_rgba(255,90,0,0.5)]">
            Araç Bul
          </button>
        </div>
      </div>

      {/* List View */}
      {cars.length === 0 ? (
        <div className="text-center text-gray-500 py-20 glass rounded-3xl">
          <p>Henüz sisteme eklenmiş bir araç bulunmuyor.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {cars.map((carItem: any) => {
            const car = carItem.attributes || carItem;
            const imageUrl = car.image?.url || car.image?.data?.attributes?.url;
            const fullImageUrl = imageUrl ? (imageUrl.startsWith('http') ? imageUrl : `${STRAPI_URL}${imageUrl}`) : null;

            const basePrice = parseFloat(car.pricePerDay || 0);
            const discountPrice = basePrice * 0.90; // %10 İndirim simülasyonu

            return (
              <div 
                key={carItem.id || carItem.documentId} 
                className="glass rounded-3xl p-6 lg:p-8 border border-white/5 flex flex-col lg:flex-row gap-8 lg:gap-12 hover:border-primary/30 transition-colors group"
              >
                {/* Araç Görseli */}
                <div className="w-full lg:w-[350px] shrink-0 flex flex-col justify-center items-center relative">
                  {/* Decorative Glow Orbit behind car */}
                  <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 rounded-full blur-[50px] transition-opacity duration-700 pointer-events-none" />
                  
                  <div className="h-[200px] w-full relative z-10">
                    {fullImageUrl ? (
                      <Image 
                        src={fullImageUrl} 
                        alt={car.brand + ' ' + car.model} 
                        fill 
                        sizes="(max-width: 768px) 100vw, 350px"
                        unoptimized={true}
                        className="object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.5)] group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-white/5 rounded-2xl flex items-center justify-center text-5xl">🚘</div>
                    )}
                  </div>
                </div>

                {/* Araç Bilgileri & İkonlar */}
                <div className="flex-1 flex flex-col justify-center">
                  <h2 className="text-3xl font-black mb-1 tracking-tight">
                    {car.brand} <span className="text-primary font-bold">{car.model}</span>
                  </h2>
                  <p className="text-gray-400 text-sm mb-6">Benzeri veya Müsaisi - {car.year || '2025'}</p>
                  
                  {/* Özellikler Grid (Avis Style) */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-2 text-sm text-gray-300 font-medium">
                    <div className="flex items-center gap-3">
                      <span className="text-xl bg-white/5 w-8 h-8 rounded-lg flex items-center justify-center">👥</span> 
                      {car.passengerCount || 5} Yolcu
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xl bg-white/5 w-8 h-8 rounded-lg flex items-center justify-center">🧳</span> 
                      {car.luggageCount || 2} Büyük Bagaj
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xl bg-white/5 w-8 h-8 rounded-lg flex items-center justify-center">⚙️</span> 
                      {car.transmission || 'Otomatik'}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xl bg-white/5 w-8 h-8 rounded-lg flex items-center justify-center">⛽</span> 
                      {car.fuelType || 'Benzin'}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xl bg-white/5 w-8 h-8 rounded-lg flex items-center justify-center">❄️</span> 
                      Klimalı
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xl bg-white/5 w-8 h-8 rounded-lg flex items-center justify-center">🛣️</span> 
                      Sınırsız KM
                    </div>
                  </div>
                </div>

                {/* Fiyat ve Butonlar (Sağ Panel) */}
                <div className="w-full lg:w-[280px] shrink-0 border-t lg:border-t-0 lg:border-l border-white/10 pt-6 lg:pt-0 lg:pl-8 flex flex-col justify-center gap-4">
                  
                  {/* Hemen Öde (İndirimli) */}
                  <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 cursor-pointer hover:bg-primary/20 transition-colors relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-primary text-black text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                      %10 İNDİRİM
                    </div>
                    <div className="text-primary text-xs font-bold tracking-wider mb-1 uppercase">Hemen Öde</div>
                    <div className="flex items-end gap-1">
                      <span className="text-3xl font-black text-white">₺{discountPrice.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</span>
                      <span className="text-gray-400 text-sm pb-1">/gün</span>
                    </div>
                  </div>

                  {/* Sonra Öde */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 cursor-pointer hover:bg-white/10 transition-colors">
                    <div className="text-gray-400 text-xs font-bold tracking-wider mb-1 uppercase">Ofiste Öde</div>
                    <div className="flex items-end gap-1">
                      <span className="text-2xl font-bold text-gray-300">₺{basePrice.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</span>
                      <span className="text-gray-500 text-sm pb-1">/gün</span>
                    </div>
                  </div>

                  {!user ? (
                    <Link 
                      href="/login" 
                      className="w-full py-4 rounded-xl font-bold text-sm lg:text-base mt-2 transition-all bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 flex justify-center items-center text-center"
                    >
                      Aracı Seçmek İçin Giriş Yap
                    </Link>
                  ) : (
                    <button 
                      disabled={car.isAvailable === false}
                      className={`w-full py-4 rounded-xl font-bold text-lg mt-2 transition-all ${car.isAvailable !== false ? 'bg-white text-black hover:bg-gray-200' : 'bg-white/5 text-gray-600 cursor-not-allowed'}`}
                    >
                      {car.isAvailable !== false ? 'Aracı Seç' : 'Tükendi'}
                    </button>
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
