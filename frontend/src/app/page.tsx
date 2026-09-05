import Hero from '@/components/Hero';
import Services from '@/components/Services';
import HomepageProjects from '@/components/HomepageProjects';
import { HomepageOffices } from '@/components/OfficesShowcase';
import HomepageShop from '@/components/HomepageShop';
import SupportSection from '@/components/SupportSection';

const INTERNAL_API_URL = process.env.INTERNAL_API_URL || 'http://backend:1337';
if (typeof window === 'undefined') {
  console.log('🌐 Frontend: Backend API adresi ->', INTERNAL_API_URL);
}

async function getActiveOffices() {
  try {
    const res = await fetch(
      `${INTERNAL_API_URL}/api/offices?filters[isActive][$eq]=true`,
      { next: { tags: ['offices'], revalidate: 300 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data?.data || [];
  } catch {
    return [];
  }
}

async function getActiveShopItems() {
  try {
    const res = await fetch(`${INTERNAL_API_URL}/api/shop/items`, {
      next: { tags: ['shop'], revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data?.data || [];
  } catch {
    return [];
  }
}

async function getActiveProjects() {
  try {
    const res = await fetch(`${INTERNAL_API_URL}/api/projects?active=true`, {
      next: { tags: ['projects'], revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data?.data || [];
  } catch {
    return [];
  }
}

export default async function Home() {
  const [offices, shopItems, projects] = await Promise.all([
    getActiveOffices(),
    getActiveShopItems(),
    getActiveProjects(),
  ]);

  return (
    <main className="min-h-screen bg-background relative">
      <Hero />
      
      <div className="section-divider max-w-[1280px] mx-auto" />
      
      <Services />
      
      <div className="section-divider max-w-[1280px] mx-auto" />

      <HomepageProjects projects={projects} />
      
      {projects.length > 0 && <div className="section-divider max-w-[1280px] mx-auto" />}
      
      <HomepageShop items={shopItems} />
      
      <div className="section-divider max-w-[1280px] mx-auto" />
      
      <HomepageOffices offices={offices} />
      
      <div className="section-divider max-w-[1280px] mx-auto" />
      
      <SupportSection />
    </main>
  );
}
