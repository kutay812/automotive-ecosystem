'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { createRental } from '@/app/actions/rental';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { getMediaUrl } from '@/lib/api';

const BACKEND_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

export default function RentCarList({ cars: initialCars, offices, activeRentals = [], user, strapiUrl }: any) {
  const router = useRouter();

  const todayDate = new Date();
  todayDate.setHours(todayDate.getHours() + 3);
  const todayStr = todayDate.toISOString().split('T')[0];

  const [pickupOffice, setPickupOffice] = useState(offices[0]?.name || '');
  const [dropoffOffice, setDropoffOffice] = useState(offices[0]?.name || '');
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(() => {
    const d = new Date(todayStr);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });

  const getMinEndDate = (start: string) => {
    const d = new Date(start);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    const minEnd = getMinEndDate(value);
    if (endDate <= value) setEndDate(minEnd);
  };
  const [cars, setCars] = useState(initialCars);
  const [carsLoading, setCarsLoading] = useState(false);
  const [loadingCarId, setLoadingCarId] = useState<string | null>(null);

  const fetchCarsForOffice = async (officeName: string) => {
    setCarsLoading(true);
    try {
      const qs = officeName ? `?pickupOffice=${encodeURIComponent(officeName)}&populate=*` : '?populate=*';
      const res = await fetch(`${BACKEND_URL}/api/cars${qs}`);
      if (res.ok) {
        const data = await res.json();
        setCars(data?.data || []);
      }
    } catch {
      // silently fail
    }
    setCarsLoading(false);
  };

  const handlePickupOfficeChange = (value: string) => {
    setPickupOffice(value);
    fetchCarsForOffice(value);
  };

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedCarForPayment, setSelectedCarForPayment] = useState<string | null>(null);

  const openPaymentModal = (carId: string) => {
    if (!pickupOffice || !dropoffOffice || !startDate || !endDate) {
      alert('Lütfen önce alış/teslim ofislerini ve tarihlerini seçin.');
      return;
    }
    
    if (user && !user.phoneNumber) {
      router.push('/complete-phone');
      return;
    }
    
    setSelectedCarForPayment(carId);
    setPaymentModalOpen(true);
  };

  const handleRentCar = async (paymentMethod: 'office' | 'online') => {
    if (!selectedCarForPayment) return;
    
    setLoadingCarId(selectedCarForPayment);
    setPaymentModalOpen(false);
    
    const res = await createRental(selectedCarForPayment, pickupOffice, dropoffOffice, startDate, endDate, paymentMethod);
    setLoadingCarId(null);
    setSelectedCarForPayment(null);

    if (res.error) {
      alert(res.error);
    } else {
      if (paymentMethod === 'online') {
        router.push(`/rentacar/payment-test?rentalId=${res.rentalId || ''}`);
      } else {
        alert('Rezervasyon talebiniz alındı! Ödeme ofiste teslim alınacaktır. Bekleyen işlemlerinize yönlendiriliyorsunuz.');
        router.push('/profile');
      }
    }
  };

  return (
    <div className="w-full max-w-[1280px] mx-auto px-6">
      {/* Search / Filter Bar */}
      <div className="card p-6 md:p-8 mb-12 flex flex-col lg:flex-row gap-4 items-end">
        <div className="w-full lg:w-1/5">
          <label className="block text-caption text-on-surface-variant mb-2 font-medium">Alış Ofisi</label>
          <select
            value={pickupOffice}
            onChange={(e) => handlePickupOfficeChange(e.target.value)}
            className="w-full rounded-lg"
          >
            {offices.length === 0 && <option value="">Ofis bulunamadı</option>}
            {offices.map((o: any) => <option key={o.id} value={o.name}>{o.name} - {o.city}</option>)}
          </select>
        </div>

        <div className="w-full lg:w-1/5">
          <label className="block text-caption text-on-surface-variant mb-2 font-medium">Teslim Ofisi</label>
          <select
            value={dropoffOffice}
            onChange={(e) => setDropoffOffice(e.target.value)}
            className="w-full rounded-lg"
          >
            {offices.length === 0 && <option value="">Ofis bulunamadı</option>}
            {offices.map((o: any) => <option key={o.id} value={o.name}>{o.name} - {o.city}</option>)}
          </select>
        </div>

        <div className="w-full lg:w-1/5">
          <label className="block text-caption text-on-surface-variant mb-2 font-medium">Alış Tarihi</label>
          <input
            type="date" min={todayStr} value={startDate} onChange={(e) => handleStartDateChange(e.target.value)}
            className="w-full rounded-lg"
          />
        </div>

        <div className="w-full lg:w-1/5">
          <label className="block text-caption text-on-surface-variant mb-2 font-medium">Teslim Tarihi</label>
          <input
            type="date" min={getMinEndDate(startDate)} value={endDate} onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-lg"
          />
        </div>

        <div className="w-full lg:w-1/5">
          <div className="flex items-center justify-center h-[46px] text-label-md text-on-surface-variant bg-surface-container rounded-lg border border-outline-variant">
            {carsLoading
              ? <span className="animate-pulse text-secondary">Araçlar yükleniyor...</span>
              : <span>{cars.length} araç bulundu</span>
            }
          </div>
        </div>
      </div>

      {/* Car List */}
      {carsLoading ? (
        <div className="text-center text-on-surface-variant py-20 card">
          <div className="w-8 h-8 border-2 border-secondary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Seçilen ofisteki araçlar yükleniyor...</p>
        </div>
      ) : cars.length === 0 ? (
        <div className="text-center text-on-surface-variant py-20 card">
          <span className="material-symbols-outlined text-[64px] text-outline mb-4">directions_car</span>
          <p className="font-bold text-primary text-headline-sm">Bu ofiste müsait araç bulunmuyor.</p>
          <p className="text-body-md mt-1">Farklı bir alış ofisi seçmeyi deneyin.</p>
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
            const imageUrl = car.image?.url || car.image?.data?.attributes?.url || car.imageUrl;
            const fullImageUrl = imageUrl
              ? (imageUrl.startsWith('http') ? imageUrl : `${strapiUrl}${imageUrl}`)
              : null;
            const basePrice = parseFloat(car.pricePerDay || 0);
            const availableDateStr = car.availableUntil ? new Date(car.availableUntil).toLocaleDateString('tr-TR') : null;

            const sDate = new Date(startDate);
            const eDate = new Date(endDate);
            const hasConflict = activeRentals.some((rental: any) => {
              const rCarId = rental.car?.id || rental.attributes?.car?.data?.id;
              if (rCarId !== carItem.id) return false;
              const rStart = new Date(rental.startDate || rental.attributes?.startDate);
              const rEnd = new Date(rental.requestedEndDate || rental.attributes?.requestedEndDate || rental.endDate || rental.attributes?.endDate);
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
                className="card p-6 lg:p-8 flex flex-col lg:flex-row gap-8 lg:gap-12"
              >
                <div className="w-full lg:w-[350px] shrink-0 flex flex-col justify-center items-center">
                  <div className="h-[200px] w-full relative">
                    {fullImageUrl ? (
                      <Image
                        src={fullImageUrl} alt={car.brand + ' ' + car.model} fill sizes="(max-width: 768px) 100vw, 350px" unoptimized
                        className="object-contain drop-shadow-md hover:scale-105 transition-transform duration-500 mix-blend-multiply"
                      />
                    ) : (
                      <div className="w-full h-full bg-surface-container rounded-lg flex items-center justify-center">
                        <span className="material-symbols-outlined text-[48px] text-outline">directions_car</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1 flex flex-col justify-center">
                  <h2 className="text-display-lg-mobile font-black mb-1 text-primary">
                    {car.brand} <span className="font-bold">{car.model}</span>
                  </h2>
                  <p className="text-on-surface-variant text-caption mb-6">Benzeri veya Müsaisi - {car.year || '2025'}</p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-2 text-label-md text-on-surface-variant">
                    <div className="flex items-center gap-2"><span className="material-symbols-outlined text-[20px] text-outline">group</span> {car.passengerCount || 5} Yolcu</div>
                    <div className="flex items-center gap-2"><span className="material-symbols-outlined text-[20px] text-outline">luggage</span> {car.luggageCount || 2} Bagaj</div>
                    <div className="flex items-center gap-2"><span className="material-symbols-outlined text-[20px] text-outline">settings</span> {car.transmission || 'Otomatik'}</div>
                    <div className="flex items-center gap-2"><span className="material-symbols-outlined text-[20px] text-outline">local_gas_station</span> {car.fuelType || 'Benzin'}</div>
                    <div className="flex items-center gap-2"><span className="material-symbols-outlined text-[20px] text-outline">ac_unit</span> Klimalı</div>
                    <div className="flex items-center gap-2"><span className="material-symbols-outlined text-[20px] text-outline">speed</span> Sınırsız KM</div>
                  </div>
                </div>

                <div className="w-full lg:w-[280px] shrink-0 border-t lg:border-t-0 lg:border-l border-outline-variant pt-6 lg:pt-0 lg:pl-8 flex flex-col justify-center gap-4">
                  <div className="bg-surface-container-low border border-outline-variant rounded-xl p-5">
                    <div className="text-secondary text-caption font-bold tracking-wider mb-1 uppercase">Günlük Fiyat</div>
                    <div className="flex items-end gap-1">
                      <span className="text-headline-md font-black text-primary">₺{basePrice.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</span>
                      <span className="text-on-surface-variant text-caption pb-1">/gün</span>
                    </div>
                  </div>

                  {!user ? (
                    <Link href="/login" className="w-full py-4 rounded-lg font-bold text-center btn-primary">
                      Aracı Seçmek İçin Giriş Yap
                    </Link>
                  ) : (
                    <button
                      onClick={() => openPaymentModal(carItem.documentId)}
                      disabled={isCarCurrentlyDisabled || loadingCarId === carItem.documentId}
                      className={`w-full py-4 rounded-lg font-bold transition-all duration-300 flex justify-center items-center ${!isCarCurrentlyDisabled ? 'btn-cta' : 'bg-surface-variant text-on-surface-variant cursor-not-allowed'}`}
                    >
                      {loadingCarId === carItem.documentId
                        ? 'İşleniyor...'
                        : (!isCarCurrentlyDisabled ? 'Hemen Kirala' : (hasConflict ? 'Bu Tarihlerde Dolu' : (availableDateStr ? `Dolu (${availableDateStr})` : 'Tükendi')))
                      }
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Payment Method Modal */}
      <AnimatePresence>
        {paymentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 max-w-md w-full shadow-[0_4px_40px_rgba(0,0,0,0.15)] relative"
            >
              <button
                onClick={() => setPaymentModalOpen(false)}
                className="absolute top-4 right-4 text-on-surface-variant hover:text-primary transition-colors duration-300"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
              
              <h3 className="text-headline-md text-primary mb-2">Ödeme Yöntemi</h3>
              <p className="text-body-md text-on-surface-variant mb-8">Lütfen aracı kiralama işlemini tamamlamak için bir ödeme yöntemi seçin.</p>
              
              <div className="flex flex-col gap-4">
                <button
                  onClick={() => handleRentCar('online')}
                  className="w-full btn-cta py-4 rounded-lg flex flex-col items-center justify-center"
                >
                  <span className="text-label-md">Online Ödeme (Kredi Kartı)</span>
                  <span className="text-caption font-normal opacity-80 mt-1">Stripe / Iyzico / PayTR altyapısı</span>
                </button>
                
                <div className="relative flex py-2 items-center">
                  <div className="flex-grow h-px bg-outline-variant"></div>
                  <span className="flex-shrink-0 mx-4 text-on-surface-variant text-caption uppercase font-bold">veya</span>
                  <div className="flex-grow h-px bg-outline-variant"></div>
                </div>

                <button
                  onClick={() => handleRentCar('office')}
                  className="w-full bg-surface border border-outline-variant text-primary hover:bg-surface-container py-4 rounded-lg font-bold transition-all duration-300 flex flex-col items-center justify-center"
                >
                  <span className="text-label-md">Ofiste Ödeme</span>
                  <span className="text-caption font-normal text-on-surface-variant mt-1">Ödemeyi aracı teslim alırken yapın</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
