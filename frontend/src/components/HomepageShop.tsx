'use client';

import Link from 'next/link';

interface ShopItem {
  id: number;
  title: string;
  price: number;
  image_url: string;
  buy_link: string;
  platform: string;
}

const platformBadge: Record<string, { label: string; cls: string }> = {
  trendyol: { label: 'Trendyol', cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  hepsiburada: { label: 'Hepsiburada', cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  n11: { label: 'N11', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
};

export default function HomepageShop({ items }: { items: ShopItem[] }) {
  if (!items || items.length === 0) return null;

  const preview = items.slice(0, 4);

  return (
    <section className="w-full bg-surface py-16">
      <div className="max-w-[1280px] mx-auto px-6">
        {/* Section Header */}
        <div className="flex justify-between items-end mb-8 border-b border-outline-variant pb-4">
          <div>
            <h2 className="text-headline-md text-primary">Öne Çıkan Parçalar</h2>
            <p className="text-body-md text-on-surface-variant mt-1">Performans ve estetik için en iyi seçimler.</p>
          </div>
          <Link
            href="/alisveris"
            className="text-label-md text-secondary hover:text-secondary-container transition-colors hidden md:flex items-center"
          >
            Tümünü Gör <span className="material-symbols-outlined ml-1 text-[18px]">arrow_forward</span>
          </Link>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {preview.map((item) => {
            const badge = platformBadge[item.platform] || { label: item.platform, cls: 'bg-gray-50 text-gray-700 border-gray-200' };
            return (
              <div key={item.id} className="card flex flex-col">
                {/* Image */}
                <div className="aspect-square bg-surface-container p-4 relative">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-full object-contain mix-blend-multiply"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-outline text-[64px]">inventory_2</span>
                    </div>
                  )}
                  <span className={`absolute top-2 left-2 chip border ${badge.cls}`}>
                    {badge.label}
                  </span>
                </div>
                {/* Info */}
                <div className="p-4 flex flex-col flex-grow text-center">
                  <h4 className="text-label-md text-primary mb-1 line-clamp-2">{item.title}</h4>
                  <div className="mt-auto flex justify-between items-center w-full pt-3">
                    <span className="text-headline-sm text-primary">₺{item.price?.toLocaleString('tr-TR')}</span>
                    <a
                      href={item.buy_link || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 rounded-full bg-surface-variant text-on-surface flex items-center justify-center hover:bg-secondary hover:text-on-secondary transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">add</span>
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile CTA */}
        <div className="mt-8 text-center md:hidden">
          <Link
            href="/alisveris"
            className="text-label-md text-secondary hover:text-secondary-container transition-colors inline-flex items-center"
          >
            Tüm Mağazayı Gör <span className="material-symbols-outlined ml-1 text-[18px]">arrow_forward</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
