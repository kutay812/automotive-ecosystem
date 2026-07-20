'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function Hero() {
  return (
    <section className="relative w-full min-h-[80vh] bg-primary-container flex flex-col justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <div
          className="w-full h-full bg-cover bg-center opacity-60"
          style={{
            backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuDuET6LPAF9vDiUh_yEFNK_E3GPTIGHj35d8TF9sdGV2WiryF58MLElnNF80dGjGgdQLImhBqt8nOU5HIefEEROEq44UL1so-4hwrZFoPdMIs87N160S1MLgPtRCsstrnDK4VyIK3pZg5pQSzoiaBp_ShCqV2snjesc-NFIR0Qw54lb42hF5vlZkllOjU-LoGH7GJLxroLHsZB3folO5tiFcN6E5a0XCuCZ1oBu_1igIl5IhJH3VVnSYMNohDGXFNE6jrshQ3w7rzc')`
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary-container via-primary-container/80 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-[1280px] mx-auto px-6 py-12 md:py-16 flex flex-col gap-16">
        {/* Hero Text */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-2xl"
        >
          <h1 className="text-display-lg-mobile md:text-display-lg text-on-primary mb-4">
            Mükemmelliği Sürün.
          </h1>
          <p className="text-body-lg text-on-primary-container mb-8">
            Premium araç kiralama, yüksek performanslı yedek parça mağazası ve profesyonel otomotiv medya prodüksiyonu tek bir ekosistemde.
          </p>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-2 flex flex-col md:flex-row gap-2 w-full max-w-3xl shadow-[0_4px_20px_rgba(26,26,26,0.2)]"
          >
            <div className="flex-1 flex items-center bg-white/10 rounded-lg px-4 py-2 border border-white/10">
              <span className="material-symbols-outlined text-outline mr-3">search</span>
              <input
                className="w-full bg-transparent border-none text-on-primary placeholder:text-outline focus:ring-0 focus:outline-none text-body-md px-0"
                placeholder="Marka, model veya parça ara..."
                type="text"
              />
            </div>
            <button className="bg-secondary text-on-secondary px-8 py-2 rounded-lg text-label-md hover:bg-secondary-container transition-colors shadow-sm">
              Hızlı Ara
            </button>
          </motion.div>
        </motion.div>

        {/* Service Cards */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-auto"
        >
          {/* Card 1 - Araç Kirala */}
          <Link
            href="/rentacar"
            className="group relative overflow-hidden rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-white/30 transition-all duration-300 hover:-translate-y-1 shadow-[0_4px_20px_rgba(26,26,26,0.1)] h-64 flex flex-col justify-end p-4"
          >
            <div className="absolute inset-0 z-0 transition-transform duration-700 group-hover:scale-105">
              <div
                className="w-full h-full bg-cover bg-center opacity-40"
                style={{
                  backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuDRS_fHXZ2yC6aOerj9__31_dm01nR0ZXVvAqZUgJnxVz8YcKQMrr28LGZvXNP3Z6svAir-mCVzSzKC7oaLtFp7M5KR7g1iYWZpKsh4etvaD95_6_6-KnnN5B9EHtADN-lbUwHuIpqeuzZcDm-1fSt150l5v2wj8oRpi_rElvfKcCF2tSofzG7ouM-WQLrlAPnIYndgl0qAX33Xw8OuyEc3-JblropxGtiFZE1asrOBoeIgZRfEnYRvAocZ44nUWu8kSMe-PzCHJi0')`
                }}
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-primary-container to-transparent z-10" />
            <div className="relative z-20 flex justify-between items-end w-full">
              <div>
                <span className="material-symbols-outlined text-secondary mb-2 text-[32px]">directions_car</span>
                <h3 className="text-headline-md text-on-primary">Araç Kirala</h3>
                <p className="text-caption text-on-primary-container mt-1">Premium filomuzu keşfedin.</p>
              </div>
              <span className="material-symbols-outlined text-on-primary transform group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </div>
          </Link>

          {/* Card 2 - Yedek Parça */}
          <Link
            href="/alisveris"
            className="group relative overflow-hidden rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-white/30 transition-all duration-300 hover:-translate-y-1 shadow-[0_4px_20px_rgba(26,26,26,0.1)] h-64 flex flex-col justify-end p-4"
          >
            <div className="absolute inset-0 z-0 transition-transform duration-700 group-hover:scale-105">
              <div
                className="w-full h-full bg-cover bg-center opacity-40"
                style={{
                  backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuD7Sr4yEtjcNRqd6-NTLWVe8jLiUNf9GBjP5DsFSfOerOIMNVWQHw4Y_eFAdXQ2MFCN3o8a2n6EU8rCxtLLIY_uB4-APfKES2P89cq7r4VURcFYsx_66EyCNzprHRlpx5YOOmQAkH0W9CUCk-cL7ggd-8l1t9ac5AJyQLrt0CEn-qonHPqbDvItsQhIaUJZyVapvUQGY7YzbHqvNCDM87iNx3MWEtWSrDjDaAKjHoDyL9-4jorHXkyGz_nm9HZueYESkzHf6LDJ0Z0')`
                }}
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-primary-container to-transparent z-10" />
            <div className="relative z-20 flex justify-between items-end w-full">
              <div>
                <span className="material-symbols-outlined text-secondary mb-2 text-[32px]">settings_input_component</span>
                <h3 className="text-headline-md text-on-primary">Yedek Parça Al</h3>
                <p className="text-caption text-on-primary-container mt-1">Orijinal ve performans parçaları.</p>
              </div>
              <span className="material-symbols-outlined text-on-primary transform group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </div>
          </Link>

          {/* Card 3 - Medya Prodüksiyon */}
          <Link
            href="/production"
            className="group relative overflow-hidden rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-white/30 transition-all duration-300 hover:-translate-y-1 shadow-[0_4px_20px_rgba(26,26,26,0.1)] h-64 flex flex-col justify-end p-4"
          >
            <div className="absolute inset-0 z-0 transition-transform duration-700 group-hover:scale-105">
              <div
                className="w-full h-full bg-cover bg-center opacity-40"
                style={{
                  backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuAj0VjonebdGWlOgZHUY2kZ3mbroN8TL1jnN6Ww1LEmFfS1OcowsqDkdyqioIM7OmX8NCbgMePHVEkxwppdcOjeCpg9DNOj42W4S__v9fnpBVjim39KfxDVB9Yt1OnrqbcsO3u2VI3GdHuJ0VTTNKzUbHpfyEuIbPifuYp794MJ6U2iaBtREI73cYlFQpYZ38fFzBeC7BhkZwzU-4OgCsDZMsA6fCaNFd8x8e2tVAIiwRAfEQBc6nqwwhVTXZc9Mx94FHU6BqurP2A')`
                }}
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-primary-container to-transparent z-10" />
            <div className="relative z-20 flex justify-between items-end w-full">
              <div>
                <span className="material-symbols-outlined text-secondary mb-2 text-[32px]">videocam</span>
                <h3 className="text-headline-md text-on-primary">Medya Prodüksiyon</h3>
                <p className="text-caption text-on-primary-container mt-1">Profesyonel çekim hizmetleri.</p>
              </div>
              <span className="material-symbols-outlined text-on-primary transform group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </div>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
