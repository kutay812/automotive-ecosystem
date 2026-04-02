'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

export default function Hero() {
  return (
    <section className="relative h-screen w-full flex items-center justify-center overflow-hidden">
      {/* Cinematic Car Background */}
      <div className="absolute inset-0 z-0 bg-[#020202]">
        <motion.div
           animate={{ scale: [1.02, 1.08, 1.02] }}
           transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
           className="w-full h-full relative"
        >
          <Image
            src="/images/hero-bg.png"
            alt="VisionArc Automotive Ecosystem"
            fill
            className="object-cover object-center opacity-[0.35]"
            priority
          />
        </motion.div>
        {/* Premium OLED Vignette Overlays for Focus */}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--background)] via-transparent to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--background)] via-transparent to-transparent opacity-80" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="flex flex-col items-center max-w-3xl"
        >
          <motion.h1 
            className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            VisionArc
          </motion.h1>
          <motion.p 
            className="text-lg md:text-xl text-gray-300 mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            Yeni nesil web ekosistemini inşa ediyoruz. Anti-Gravity dünyasına adım atın.
          </motion.p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-4 bg-white/10 border border-white/20 rounded-full text-white font-medium hover:bg-white/20 hover:border-[#FF5A00]/50 transition-all shadow-[0_0_20px_rgba(255,90,0,0.2)] hover:shadow-[0_0_30px_rgba(255,90,0,0.5)]"
          >
            Projeleri Keşfet
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}
