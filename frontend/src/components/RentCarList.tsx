'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { createRental } from '@/app/actions/rental';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export default function RentCarList({ cars, offices, activeRentals = [], user, strapiUrl }: any) {
  const router = useRouter();

  // Turkey UTC+3 adjustment
  const todayDate = new Date();
  todayDate.setHours(todayDate.getHours() + 3);
  const todayStr = todayDate.toISOString().split('T')[0];

  const [pickupOffice, setPickupOffice] = useState(offices[0]?.name || '');
  const [dropoffOffice, setDropoffOffice] = useState(offices[0]?.name || '');
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);

  const [loadingCarId, setLoadingCarId] = useState<number | null>(null);

  const handleRentCar = async (carId: string) => {
    if (!pickupOffice || !dropoffOffice || !startDate || !endDate) {
      alert("Lütfen önce alış/teslim ofislerini ve tarihlerini seçin.");
      return;
    }
    
    setLoadingCarId(carId);
    const res = await createRental(carId, pickupOffice, dropoffOffice, startDate, endDate);
    setLoadingCarId(null);

    if (res.error) {
      alert(res.error);
    } else {
      alert("Rezervasyon talebiniz alındı! Bekleyen işlemlerinize yönlendiriliyorsunuz.");
      router.push('/profile');
    }
  };

  return (
    <>
      <div className="glass p-6 md:p-8 rounded-3xl mb-12 flex flex-col lg:flex-row gap-4 items-end border border-white/5 shadow-2xl">
        <div className="w-full lg:w-1/5">
          <label className="block text-sm text-gray-400 mb-2">Alış Ofisi</label>
          <select 
            value={pickupOffice} onChange={(e) => setPickupOffice(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary cursor-pointer hover:bg-black/60 transition-colors appearance-none"
          >
            {offices.length === 0 && <option value="">Ofis bulunamadı</option>}
            {offices.map((o: any) => <option key={o.id} value={o.name}>{o.name} - {o.city}</option>)}
          </select>
        </div>

        <div className="w-full lg:w-1/5">
          <label className="block text-sm text-gray-400 mb-2">Teslim Ofisi</label>
          <select 
            value={dropoffOffice} onChange={(e) => setDropoffOffice(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary cursor-pointer hover:bg-black/60 transition-colors appearance-none"
          >
            {offices.length === 0 && <option value="">Ofis bulunamadı</option>}
            {offices.map((o: any) => <option key={o.id} value={o.name}>{o.name} - {o.city}</option>)}
          </select>
        </div>

        <div className="w-full lg:w-1/5">
          <label className="block text-sm text-gray-400 mb-2">Alış Tarihi</label>
          <input 
            type="date" min={todayStr} value={startDate} onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary transition-colors hover:bg-black/60 [color-scheme:dark]" 
          />
        </div>

        <div className="w-full lg:w-1/5">
          <label className="block text-sm text-gray-400 mb-2">Teslim Tarihi</label>
          <input 
            type="date" min={startDate} value={endDate} onChange={(e) => setEndDate(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-primary transition-colors hover:bg-black/60 [color-scheme:dark]" 
          />
        </div>

        <div className="w-full lg:w-1/5 flex gap-4">
          <button className="w-full bg-primary text-black font-bold py-3 rounded-xl hover:bg-primary/90 transition-colors text-lg shadow-[0_0_15px_rgba(255,90,0,0.3)] hover:shadow-[0_0_25px_rgba(255,90,0,0.5)]">
            Arama Yap
          </button>
        </div>
      </div>

      {cars.length === 0 ? (
        <div className="text-center text-gray-500 py-20 glass rounded-3xl">
          <p>Henüz sisteme eklenmiş bir araç bulunmuyor.</p>
        </div>
      ) : (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="flex flex-col gap-6"
      >
        {cars.map((carItem: any, index: number) => {
            const car = carItem.attributes || carItem;
            const imageUrl = car.image?.url || car.image?.data?.attributes?.url;
            const fullImageUrl = imageUrl ? (imageUrl.startsWith('http') ? imageUrl : `${strapiUrl}${imageUrl}`) : null;
            const basePrice = parseFloat(car.pricePerDay || 0);
            const discountPrice = basePrice * 0.90;

            // Tarih ve Müsaitlik Formatı
            const availableDateStr = car.availableUntil ? new Date(car.availableUntil).toLocaleDateString('tr-TR') : null;

            // Çifte Rezervasyon Engeli: Check date overlaps
            const sDate = new Date(startDate);
            const eDate = new Date(endDate);
            const hasConflict = activeRentals.some((rental: any) => {
              const rCarId = rental.car?.id || rental.attributes?.car?.data?.id;
              if (rCarId !== carItem.id) return false;
              
              const rStart = new Date(rental.startDate || rental.attributes?.startDate);
              const rEnd = new Date(rental.requestedEndDate || rental.attributes?.requestedEndDate || rental.endDate || rental.attributes?.endDate);
              
              // Dates overlap if (selectedStart <= rentalEnd && rentalStart <= selectedEnd)
              return sDate <= rEnd && rStart <= eDate;
            });

            const isCarCurrentlyDisabled = car.isAvailable === false || hasConflict;

            return (
              <motion.div 
                key={carItem.id} 
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="glass rounded-3xl p-6 lg:p-8 border border-white/5 flex flex-col lg:flex-row gap-8 lg:gap-12 hover:border-primary/30 transition-colors group"
              >
                <div className="w-full lg:w-[350px] shrink-0 flex flex-col justify-center items-center relative">
                  <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 rounded-full blur-[50px] transition-opacity duration-700 pointer-events-none" />
                  <div className="h-[200px] w-full relative z-10">
                    {fullImageUrl ? (
                      <Image 
                        src={fullImageUrl} alt={car.brand + ' ' + car.model} fill sizes="(max-width: 768px) 100vw, 350px" unoptimized
                        className="object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.5)] group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-white/5 rounded-2xl flex items-center justify-center text-5xl">🚘</div>
                    )}
                  </div>
                </div>

                <div className="flex-1 flex flex-col justify-center">
                  <h2 className="text-3xl font-black mb-1 tracking-tight">
                    {car.brand} <span className="text-primary font-bold">{car.model}</span>
                  </h2>
                  <p className="text-gray-400 text-sm mb-6">Benzeri veya Müsaisi - {car.year || '2025'}</p>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-2 text-sm text-gray-300 font-medium">
                    <div className="flex items-center gap-3"><span className="text-xl bg-white/5 w-8 h-8 rounded-lg flex items-center justify-center">👥</span> {car.passengerCount || 5} Yolcu</div>
                    <div className="flex items-center gap-3"><span className="text-xl bg-white/5 w-8 h-8 rounded-lg flex items-center justify-center">🧳</span> {car.luggageCount || 2} Bagaj</div>
                    <div className="flex items-center gap-3"><span className="text-xl bg-white/5 w-8 h-8 rounded-lg flex items-center justify-center">⚙️</span> {car.transmission || 'Otomatik'}</div>
                    <div className="flex items-center gap-3"><span className="text-xl bg-white/5 w-8 h-8 rounded-lg flex items-center justify-center">⛽</span> {car.fuelType || 'Benzin'}</div>
                    <div className="flex items-center gap-3"><span className="text-xl bg-white/5 w-8 h-8 rounded-lg flex items-center justify-center">❄️</span> Klimalı</div>
                    <div className="flex items-center gap-3"><span className="text-xl bg-white/5 w-8 h-8 rounded-lg flex items-center justify-center">🛣️</span> Sınırsız KM</div>
                  </div>
                </div>

                <div className="w-full lg:w-[280px] shrink-0 border-t lg:border-t-0 lg:border-l border-white/10 pt-6 lg:pt-0 lg:pl-8 flex flex-col justify-center gap-4">
                  <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 cursor-pointer hover:bg-primary/20 transition-colors relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-primary text-black text-[10px] font-bold px-2 py-1 rounded-bl-lg">%10 İNDİRİM</div>
                    <div className="text-primary text-xs font-bold tracking-wider mb-1 uppercase">Hemen Öde</div>
                    <div className="flex items-end gap-1">
                      <span className="text-3xl font-black text-white">₺{discountPrice.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</span>
                      <span className="text-gray-400 text-sm pb-1">/gün</span>
                    </div>
                  </div>

                  {!user ? (
                    <Link href="/login" className="w-full py-4 rounded-xl font-bold text-sm lg:text-base mt-2 transition-all bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 flex justify-center items-center text-center">
                      Aracı Seçmek İçin Giriş Yap
                    </Link>
                  ) : (
                    <button 
                      onClick={() => handleRentCar(carItem.documentId)}
                      disabled={isCarCurrentlyDisabled || loadingCarId === carItem.id}
                      className={`w-full py-4 rounded-xl font-bold text-lg mt-2 transition-all flex justify-center items-center ${!isCarCurrentlyDisabled ? 'bg-white text-black hover:bg-gray-200' : 'bg-white/5 text-gray-400 cursor-not-allowed'}`}
                    >
                      {loadingCarId === carItem.id 
                        ? 'İşleniyor...' 
                        : (!isCarCurrentlyDisabled ? 'Aracı Seç' : (hasConflict ? 'Bu Tarihlerde Dolu' : (availableDateStr ? `Dolu (${availableDateStr})` : 'Tükendi')))
                      }
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </>
  );
}
