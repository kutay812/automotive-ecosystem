'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import Link from 'next/link';

interface Office {
  id: number;
  documentId: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  location?: string | null;
  openingTime?: string | null;
  closingTime?: string | null;
}

function getStaticEmbedUrl(office: Office): string {
  const query = office.address
    ? `${office.address}, ${office.city}`
    : office.city || office.name;
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
}

function getDirectionsUrl(office: Office): string {
  if (office.location && office.location.trim()) {
    return office.location.trim();
  }
  const destination = office.address
    ? `${office.address}, ${office.city}`
    : office.city || office.name;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

/* ========================================
   FULL PAGE: /ofislerimiz  
   ======================================== */
export default function OfficesShowcase({ offices }: { offices: Office[] }) {
  const [expandedMap, setExpandedMap] = useState<string | null>(null);

  return (
    <section className="w-full bg-background py-16">
      <div className="max-w-[1280px] mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12 border-b border-outline-variant pb-8">
          <h1 className="text-display-lg-mobile md:text-display-lg text-primary mb-4">
            Ofislerimiz
          </h1>
          <p className="text-body-lg text-on-surface-variant max-w-2xl mx-auto">
            Example kiralama ofislerine kolayca ulaşın. Adres, çalışma saatleri ve
            konum bilgileri ile tüm şubelerimizi keşfedin.
          </p>
        </div>

        {/* Office Grid */}
        {offices.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {offices.map((office, index) => {
              const embedUrl = getStaticEmbedUrl(office);
              const directionsUrl = getDirectionsUrl(office);
              const isExpanded = expandedMap === office.documentId;

              return (
                <div
                  key={office.documentId || office.id}
                  className="card group flex flex-col"
                >
                  {/* Map Section */}
                  <div
                    className={`relative w-full transition-all duration-500 ${isExpanded ? 'h-80' : 'h-48'} bg-surface-container overflow-hidden rounded-t-xl`}
                  >
                    <iframe
                      src={embedUrl}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title={`${office.name} Konum`}
                      className="grayscale group-hover:grayscale-0 transition-all duration-700 mix-blend-multiply"
                    />
                    <button
                      onClick={() => setExpandedMap(isExpanded ? null : office.documentId)}
                      className="absolute bottom-3 right-3 bg-surface/80 hover:bg-surface text-on-surface text-caption font-bold px-3 py-1.5 rounded-lg shadow-sm backdrop-blur-md transition-all border border-outline-variant flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">{isExpanded ? 'fullscreen_exit' : 'fullscreen'}</span>
                      {isExpanded ? 'Küçült' : 'Genişlet'}
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-6 flex flex-col flex-grow bg-surface rounded-b-xl border border-t-0 border-outline-variant">
                    {/* Name & City */}
                    <div className="mb-4">
                      <h3 className="text-headline-sm text-primary group-hover:text-secondary transition-colors duration-300 mb-1">
                        {office.name}
                      </h3>
                      <span className="inline-flex items-center gap-1 text-label-md text-on-surface-variant">
                        <span className="material-symbols-outlined text-[18px]">location_on</span>
                        {office.city}
                      </span>
                    </div>

                    {/* Info Rows */}
                    <div className="space-y-4 flex-grow">
                      {/* Address */}
                      {office.address && (
                        <div className="flex items-start gap-3">
                          <span className="material-symbols-outlined text-[20px] text-outline mt-0.5">map</span>
                          <p className="text-body-md text-on-surface-variant leading-relaxed">{office.address}</p>
                        </div>
                      )}

                      {/* Phone */}
                      {office.phone && (
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-[20px] text-outline">call</span>
                          <a
                            href={`tel:${office.phone.replace(/\s/g, '')}`}
                            className="text-body-md text-primary hover:text-secondary transition-colors duration-300 font-medium"
                          >
                            {office.phone}
                          </a>
                        </div>
                      )}

                      {/* Working Hours */}
                      {office.openingTime && office.closingTime && (
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-[20px] text-outline">schedule</span>
                          <div>
                            <span className="text-body-md text-on-surface-variant font-medium block">
                              {office.openingTime} – {office.closingTime}
                            </span>
                            <span className="text-caption text-outline">Hafta içi çalışma saatleri</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-6 pt-4 border-t border-outline-variant">
                      {office.phone && (
                        <a
                          href={`tel:${office.phone.replace(/\s/g, '')}`}
                          className="flex-1 btn-secondary text-label-md py-2.5 rounded-lg text-center flex justify-center items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[18px]">call</span> Ara
                        </a>
                      )}
                      <a
                        href={directionsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 bg-surface border border-outline-variant hover:bg-surface-container text-primary text-label-md font-bold py-2.5 rounded-lg text-center transition-all flex justify-center items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[18px]">directions</span> Yol Tarifi
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-20 card">
            <span className="material-symbols-outlined text-[64px] text-outline mb-4">store</span>
            <h3 className="text-headline-sm font-bold text-primary mb-2">
              Yakında Burada!
            </h3>
            <p className="text-body-md text-on-surface-variant max-w-sm mx-auto">
              Ofis bilgilerimiz hazırlanıyor. Kısa süre içinde tüm şubelerimizi burada bulabileceksiniz.
            </p>
          </div>
        )}

        {/* Bottom CTA */}
        {offices.length > 0 && (
          <div className="text-center mt-12 pt-8 border-t border-outline-variant">
            <div className="card inline-flex items-center gap-4 px-8 py-4 rounded-xl">
              <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px] text-on-secondary-container">help</span>
              </div>
              <div className="text-left">
                <p className="text-label-md font-bold text-primary">Sorularınız mı var?</p>
                <p className="text-caption text-on-surface-variant">Herhangi bir ofisimizi arayarak bilgi alabilirsiniz.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ========================================
   HOMEPAGE SECTION: Compact offices preview
   ======================================== */
export function HomepageOffices({ offices }: { offices: Office[] }) {
  if (!offices || offices.length === 0) return null;

  const displayOffices = offices.slice(0, 3);

  return (
    <section className="w-full bg-surface py-16">
      <div className="max-w-[1280px] mx-auto px-6">
        {/* Section Header */}
        <div className="flex justify-between items-end mb-8 border-b border-outline-variant pb-4">
          <div>
            <h2 className="text-headline-md text-primary">Şubelerimiz</h2>
            <p className="text-body-md text-on-surface-variant mt-1">Size en yakın Example kiralama ofisini bulun.</p>
          </div>
          <Link
            href="/ofislerimiz"
            className="text-label-md text-secondary hover:text-secondary-container transition-colors hidden md:flex items-center"
          >
            Tümünü Gör <span className="material-symbols-outlined ml-1 text-[18px]">arrow_forward</span>
          </Link>
        </div>

        {/* Office Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayOffices.map((office) => {
            const embedUrl = getStaticEmbedUrl(office);
            const directionsUrl = getDirectionsUrl(office);

            return (
              <div key={office.documentId || office.id} className="card group h-full flex flex-col">
                {/* Mini Map */}
                <div className="relative w-full h-40 bg-surface-container overflow-hidden border-b border-outline-variant">
                  <iframe
                    src={embedUrl}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title={`${office.name} Konum`}
                    className="grayscale group-hover:grayscale-0 transition-all duration-700 pointer-events-none mix-blend-multiply"
                  />
                </div>

                {/* Content */}
                <div className="p-5 flex flex-col flex-grow">
                  <h3 className="text-label-md text-primary mb-1 group-hover:text-secondary transition-colors">
                    {office.name}
                  </h3>
                  <span className="inline-flex items-center gap-1 text-caption text-on-surface-variant mb-3">
                    <span className="material-symbols-outlined text-[14px]">location_on</span>
                    {office.city}
                  </span>

                  {office.address && (
                    <p className="text-caption text-on-surface-variant leading-relaxed mb-3 line-clamp-2">
                      {office.address}
                    </p>
                  )}

                  <div className="flex flex-col gap-2 text-caption text-on-surface-variant mb-4 mt-auto">
                    {office.phone && (
                      <span className="inline-flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">call</span>
                        {office.phone}
                      </span>
                    )}
                    {office.openingTime && office.closingTime && (
                      <span className="inline-flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">schedule</span>
                        {office.openingTime} – {office.closingTime}
                      </span>
                    )}
                  </div>

                  {/* Action Row */}
                  <div className="flex gap-2 pt-3 border-t border-outline-variant">
                    <a
                      href={directionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 btn-cta text-label-md py-2 rounded-lg text-center"
                    >
                      Yol Tarifi
                    </a>
                    {office.phone && (
                      <a
                        href={`tel:${office.phone.replace(/\s/g, '')}`}
                        className="flex-1 bg-surface border border-outline-variant hover:bg-surface-container text-primary text-label-md py-2 rounded-lg text-center transition-all"
                      >
                        Ara
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile CTA */}
        <div className="mt-8 text-center md:hidden">
          <Link
            href="/ofislerimiz"
            className="text-label-md text-secondary hover:text-secondary-container transition-colors inline-flex items-center"
          >
            Tüm Ofisleri Gör <span className="material-symbols-outlined ml-1 text-[18px]">arrow_forward</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
