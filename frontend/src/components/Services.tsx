'use client';

import Link from 'next/link';

export default function Services() {
  return (
    <section className="w-full bg-surface py-16">
      <div className="max-w-[1280px] mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-headline-md text-primary mb-2">Hizmetlerimiz</h2>
          <p className="text-body-md text-on-surface-variant">Otomotiv dünyasında ihtiyacınız olan her şey tek çatı altında.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/rentacar" className="card group p-8 text-center hover:shadow-ambient">
            <span className="material-symbols-outlined text-secondary text-[48px] mb-4">directions_car</span>
            <h3 className="text-headline-sm text-primary mb-2">Araç Kiralama</h3>
            <p className="text-body-md text-on-surface-variant">Premium araç filomuzdan istediğiniz aracı seçin, hemen kiralayın.</p>
            <span className="inline-flex items-center text-label-md text-secondary mt-4 group-hover:gap-2 transition-all">
              Keşfet <span className="material-symbols-outlined text-[18px] ml-1">arrow_forward</span>
            </span>
          </Link>

          <Link href="/alisveris" className="card group p-8 text-center hover:shadow-ambient">
            <span className="material-symbols-outlined text-secondary text-[48px] mb-4">settings_input_component</span>
            <h3 className="text-headline-sm text-primary mb-2">Yedek Parça</h3>
            <p className="text-body-md text-on-surface-variant">Orijinal ve performans yedek parçaları güvenle satın alın.</p>
            <span className="inline-flex items-center text-label-md text-secondary mt-4 group-hover:gap-2 transition-all">
              Mağazaya Git <span className="material-symbols-outlined text-[18px] ml-1">arrow_forward</span>
            </span>
          </Link>

          <Link href="/production" className="card group p-8 text-center hover:shadow-ambient">
            <span className="material-symbols-outlined text-secondary text-[48px] mb-4">videocam</span>
            <h3 className="text-headline-sm text-primary mb-2">Medya Prodüksiyon</h3>
            <p className="text-body-md text-on-surface-variant">Profesyonel otomotiv çekimleri ve medya üretim hizmetleri.</p>
            <span className="inline-flex items-center text-label-md text-secondary mt-4 group-hover:gap-2 transition-all">
              Portfolyo <span className="material-symbols-outlined text-[18px] ml-1">arrow_forward</span>
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
