import { fetchPublicShopItems, fetchShopCategories } from '@/app/actions/admin';
import ShopShowcase from '@/components/ShopShowcase';

export const metadata = {
  title: 'Alışveriş | Example Market',
  description: 'Example mağazalarındaki ürünlere göz atın. Trendyol, Hepsiburada ve N11 üzerinden doğrudan satın alın.',
};

export default async function AlisverisPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const [items, categories, params] = await Promise.all([
    fetchPublicShopItems(),
    fetchShopCategories(),
    searchParams,
  ]);

  return (
    <main className="min-h-screen relative">
      <ShopShowcase items={items} categories={categories} initialQuery={params?.q || ''} />
    </main>
  );
}
