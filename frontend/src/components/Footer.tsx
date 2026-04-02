import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full border-t border-white/10 bg-black/40 backdrop-blur-lg py-12 px-6 mt-20 relative z-10">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="col-span-1 md:col-span-2">
          <Link href="/">
            <h2 className="text-2xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary to-white mb-4">
              VISIONARC
            </h2>
          </Link>
          <p className="text-gray-400 text-sm max-w-sm">
            Next.js frontend, Strapi backend ve premium 3D tasarım deneyimleri sunan ekosistem mimarisi. E-ticaret, araç kiralama ve prodüksiyon alanlarında hizmet veriyoruz.
          </p>
        </div>
        
        <div>
          <h3 className="font-semibold text-white mb-4">Ekosistem</h3>
          <ul className="flex flex-col gap-2 text-sm text-gray-400">
            <li><Link href="/" className="hover:text-primary transition-colors">Kurumsal</Link></li>
            <li><Link href="/rentacar" className="hover:text-primary transition-colors">Araç Kiralama</Link></li>
            <li><Link href="/production" className="hover:text-primary transition-colors">Prodüksiyon</Link></li>
            <li><Link href="/ecommerce" className="hover:text-primary transition-colors">E-Ticaret</Link></li>
          </ul>
        </div>
        
        <div>
          <h3 className="font-semibold text-white mb-4">İletişim</h3>
          <ul className="flex flex-col gap-2 text-sm text-gray-400">
            <li><a href="#" className="hover:text-primary transition-colors">Instagram</a></li>
            <li><a href="#" className="hover:text-primary transition-colors">LinkedIn</a></li>
            <li><a href="#" className="hover:text-primary transition-colors">Twitter</a></li>
            <li><a href="mailto:contact@visionarc.com" className="hover:text-primary transition-colors">contact@visionarc.com</a></li>
          </ul>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto border-t border-white/5 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between text-xs text-gray-500">
        <p>&copy; {new Date().getFullYear()} VisionArc Web Ekosistemi. Tüm hakları saklıdır.</p>
        <div className="flex gap-4 mt-4 md:mt-0">
          <a href="#" className="hover:text-white transition-colors">Gizlilik Politikası</a>
          <a href="#" className="hover:text-white transition-colors">Kullanım Şartları</a>
        </div>
      </div>
    </footer>
  );
}
