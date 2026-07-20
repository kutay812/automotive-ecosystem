'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PART_CATEGORIES, VEHICLE_BRANDS } from '@/lib/shopCategories';

interface ShopItem {
  id: number;
  title: string;
  price: number;
  image_url: string;
  buy_link: string;
  platform: string;
  category: string;
  sub_category?: string;
  vehicle_brand?: string;
  vehicle_model?: string;
}

const PLATFORMS = [
  { key: 'all', label: 'Tümü', icon: 'storefront' },
  { key: 'trendyol', label: 'Trendyol', icon: 'shopping_bag' },
  { key: 'hepsiburada', label: 'Hepsiburada', icon: 'shopping_bag' },
  { key: 'n11', label: 'N11', icon: 'shopping_bag' },
];

const platformBadge: Record<string, string> = {
  trendyol: 'bg-orange-50 text-orange-700 border-orange-200',
  hepsiburada: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  n11: 'bg-purple-50 text-purple-700 border-purple-200',
};

const categoryIcons: Record<string, string> = {
  "Motor ve Mekanik": "settings",
  "Şanzıman ve Aktarma": "published_with_changes",
  "Fren Sistemi": "front_hand",
  "Süspansiyon ve Yürüyen Aksam": "route",
  "Elektrik ve Elektronik": "bolt",
  "Aydınlatma Sistemleri": "lightbulb",
  "Filtre ve Bakım Ürünleri": "science",
  "Klima ve Soğutma": "ac_unit",
  "Kaporta ve Dış Aksam": "door_front",
  "İç Mekan": "event_seat",
  "Lastik ve Jant": "tire_repair",
  "Egzoz Sistemi": "air",
  "Performans ve Modifiye": "speed",
  "Oto Aksesuar": "cable"
};

export default function ShopShowcase({ items }: { items: ShopItem[]; categories?: string[] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [selectedModel, setSelectedModel] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSubCategory, setSelectedSubCategory] = useState('all');
  const [selectedPlatform, setSelectedPlatform] = useState('all');

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (selectedPlatform !== 'all' && item.platform !== selectedPlatform) return false;
      if (selectedBrand !== 'all') {
        if (item.vehicle_brand && item.vehicle_brand !== selectedBrand) return false;
      }
      if (selectedModel !== 'all') {
        if (item.vehicle_model && item.vehicle_model !== selectedModel) return false;
      }
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
      if (selectedSubCategory !== 'all' && item.sub_category !== selectedSubCategory) return false;
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesTitle = item.title?.toLowerCase().includes(query);
        const matchesBrand = item.vehicle_brand?.toLowerCase().includes(query);
        const matchesModel = item.vehicle_model?.toLowerCase().includes(query);
        const matchesCategory = item.category?.toLowerCase().includes(query);
        const matchesSub = item.sub_category?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesBrand && !matchesModel && !matchesCategory && !matchesSub) return false;
      }
      return true;
    });
  }, [items, selectedPlatform, selectedBrand, selectedModel, selectedCategory, selectedSubCategory, searchQuery]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedBrand('all');
    setSelectedModel('all');
    setSelectedCategory('all');
    setSelectedSubCategory('all');
    setSelectedPlatform('all');
  };

  const currentBrandModels = useMemo(() => {
    if (selectedBrand === 'all') return [];
    const brand = VEHICLE_BRANDS.find(b => b.name === selectedBrand);
    return brand ? brand.models : [];
  }, [selectedBrand]);

  const currentSubCategories = useMemo(() => {
    if (selectedCategory === 'all') return [];
    const cat = PART_CATEGORIES.find(c => c.name === selectedCategory);
    return cat ? cat.subcategories : [];
  }, [selectedCategory]);

  return (
    <section className="w-full bg-background py-16">
      <div className="max-w-[1280px] mx-auto px-6">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-display-lg-mobile md:text-display-lg text-primary mb-4">
            Yedek Parça & Aksesuar
          </h2>
          <p className="text-body-lg text-on-surface-variant max-w-2xl mx-auto">
            Aracınız için en uygun yedek parça ve aksesuarları binlerce seçenek arasından kolayca bulun.
          </p>
        </div>

        {/* Global Search Bar */}
        <div className="max-w-3xl mx-auto mb-10 relative">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-outline">search</span>
          </div>
          <input
            type="text"
            placeholder="Parça adı, OEM kodu veya kategori ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 rounded-xl border border-outline-variant bg-surface text-on-surface text-body-lg focus:border-secondary transition-all shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-4 flex items-center text-outline hover:text-on-surface-variant"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          )}
        </div>

        {/* Filters Panel */}
        <div className="card p-6 mb-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            
            <div className="flex flex-col gap-1">
              <label className="text-caption text-on-surface-variant font-medium">Satıcı Platform</label>
              <select 
                value={selectedPlatform} 
                onChange={e => setSelectedPlatform(e.target.value)}
                className="rounded-lg bg-surface border-outline-variant"
              >
                {PLATFORMS.map(p => (
                  <option key={p.key} value={p.key}>{p.label}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-caption text-on-surface-variant font-medium">Araç Markası</label>
              <select 
                value={selectedBrand} 
                onChange={e => { setSelectedBrand(e.target.value); setSelectedModel('all'); }}
                className="rounded-lg bg-surface border-outline-variant"
              >
                <option value="all">Tüm Markalar</option>
                {Object.keys(VEHICLE_BRANDS).map(brand => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-caption text-on-surface-variant font-medium">Araç Modeli</label>
              <select 
                value={selectedModel} 
                onChange={e => setSelectedModel(e.target.value)}
                disabled={selectedBrand === 'all' || currentBrandModels.length === 0}
                className="rounded-lg bg-surface border-outline-variant disabled:opacity-50"
              >
                <option value="all">Tüm Modeller</option>
                {currentBrandModels.map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-caption text-on-surface-variant font-medium">Kategori</label>
              <select 
                value={selectedCategory} 
                onChange={e => { setSelectedCategory(e.target.value); setSelectedSubCategory('all'); }}
                className="rounded-lg bg-surface border-outline-variant"
              >
                <option value="all">Tüm Kategoriler</option>
                {PART_CATEGORIES.map(cat => (
                  <option key={cat.name} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-caption text-on-surface-variant font-medium">Alt Kategori</label>
              <select 
                value={selectedSubCategory} 
                onChange={e => setSelectedSubCategory(e.target.value)}
                disabled={selectedCategory === 'all' || currentSubCategories.length === 0}
                className="rounded-lg bg-surface border-outline-variant disabled:opacity-50"
              >
                <option value="all">Tümü</option>
                {currentSubCategories.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
            
          </div>
          
          <div className="mt-4 flex justify-end">
            <button 
              onClick={clearFilters}
              className="text-label-md text-secondary hover:text-secondary-container transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[18px]">clear_all</span> Temizle
            </button>
          </div>
        </div>

        {/* Count Label */}
        <div className="flex items-center justify-between mb-6 border-b border-outline-variant pb-2">
          <p className="text-body-md text-on-surface-variant">
            Toplam <span className="font-bold text-primary">{filteredItems.length}</span> ürün listeleniyor
          </p>
        </div>

        {filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredItems.map((item, i) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.3) }}
                  className="h-full"
                >
                  <div className="card h-full flex flex-col group">
                    
                    {/* Image Container */}
                    <div className="relative aspect-square bg-surface-container overflow-hidden border-b border-outline-variant">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.title}
                          className="w-full h-full object-contain p-4 mix-blend-multiply group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-[64px] text-outline">inventory_2</span>
                        </div>
                      )}

                      {/* Platform Badge */}
                      <span className={`absolute top-3 left-3 chip border ${platformBadge[item.platform] || 'bg-surface border-outline-variant text-on-surface-variant'}`}>
                        {PLATFORMS.find(p => p.key === item.platform)?.label}
                      </span>

                      {/* Dynamic Vehicle Match Label */}
                      {item.vehicle_brand && (
                        <span className="absolute bottom-3 left-3 bg-surface/80 backdrop-blur-md text-on-surface text-caption px-2.5 py-1 rounded-lg font-semibold border border-outline-variant flex items-center gap-1 shadow-sm">
                          <span className="material-symbols-outlined text-[14px]">directions_car</span> {item.vehicle_brand} {item.vehicle_model && `• ${item.vehicle_model}`}
                        </span>
                      )}
                    </div>

                    {/* Content Details */}
                    <div className="p-4 flex flex-col flex-grow text-center">
                      
                      {/* Hierarchical category description */}
                      <div className="flex justify-center items-center gap-1 mb-2 text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">
                        <span className="material-symbols-outlined text-[14px]">{categoryIcons[item.category] || 'inventory_2'}</span>
                        <span>{item.category || 'Diğer'}</span>
                      </div>

                      {/* Product Title */}
                      <h3 className="text-label-md text-primary mb-4 line-clamp-2 leading-snug break-words group-hover:text-secondary transition-colors">
                        {item.title}
                      </h3>

                      {/* Price & Buy Link */}
                      <div className="flex items-center justify-between mt-auto pt-3 border-t border-outline-variant w-full">
                        <p className="text-headline-sm font-black text-primary">
                          {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(item.price)}
                        </p>

                        {item.buy_link ? (
                          <a
                            href={item.buy_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-10 h-10 rounded-full bg-surface-variant text-on-surface flex items-center justify-center hover:bg-secondary hover:text-on-secondary transition-colors"
                            title="Satın Al"
                          >
                            <span className="material-symbols-outlined text-[20px]">shopping_cart</span>
                          </a>
                        ) : (
                          <span className="text-caption text-outline">Link yok</span>
                        )}
                      </div>

                    </div>

                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-24 card rounded-3xl">
            <span className="material-symbols-outlined text-[64px] text-outline mb-4">inventory_2</span>
            <h3 className="text-headline-sm font-bold text-primary mb-2">Uyumlu Ürün Bulunamadı</h3>
            <p className="text-body-md text-on-surface-variant max-w-md mx-auto">
              Seçmiş olduğunuz kriterlere uygun ürün bulunamadı. Filtreleri sıfırlayarak tekrar arayabilirsiniz.
            </p>
            <button
              onClick={clearFilters}
              className="mt-6 px-6 py-2 btn-secondary rounded-lg text-label-md"
            >
              Filtreleri Temizle
            </button>
          </div>
        )}

      </div>
    </section>
  );
}
