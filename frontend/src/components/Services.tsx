'use client';

import { motion } from 'framer-motion';

const services = [
  {
    title: 'Dijital Pazarlama',
    desc: 'Veri odaklı, yeni nesil büyüme stratejileri.',
    icon: '🚀'
  },
  {
    title: 'E-Ticaret Merkezi',
    desc: 'Maksimum dönüşüm için kusursuz ikas/Ticimax entegrasyonları.',
    icon: '🛒'
  },
  {
    title: 'Premium Araç Kiralama',
    desc: 'Merkezi portalımız üzerinden yönetilen lüks araç filoları.',
    icon: '🏎️'
  },
  {
    title: 'Medya Prodüksiyonu',
    desc: 'Sinematik marka oluşturma ve 3D görsel deneyimler.',
    icon: '🎥'
  }
];

export default function Services() {
  return (
    <section className="py-24 px-6 relative z-10">
      <div className="max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Ekosistemimiz</h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            Anti-Gravity web deneyimiyle birleştirilmiş kusursuz bir marka evreni.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              whileHover={{ y: -10, scale: 1.02 }}
              className="glass p-8 rounded-2xl border border-white/5 group"
            >
              <div className="text-4xl mb-6 bg-white/5 w-16 h-16 flex items-center justify-center rounded-xl group-hover:bg-primary/20 transition-colors">
                {service.icon}
              </div>
              <h3 className="text-xl font-bold mb-3">{service.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                {service.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
