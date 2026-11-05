# VisionArc - Frontend Web Uygulaması

VisionArc platformunun son kullanıcı arayüzünü, kurumsal vitrinini ve yönetici panelini (Admin Dashboard) sunan Next.js 16 ve React 19 tabanlı modern web uygulaması.

---

## 🛠️ Teknoloji Yığını

- **Framework:** [Next.js 16.4.5](https://nextjs.org/) (App Router, Server Actions, Standalone Output)
- **Kütüphane:** [React 19.3.1](https://react.dev/)
- **Stil & Tasarım:** [Tailwind CSS v4](https://tailwindcss.com/), Google Fonts (Inter & Outfit), Material Symbols
- **Animasyon:** [Framer Motion 12.43](https://www.framer.com/motion/)
- **Yetkilendirme:** `jose` ile istemci/kenar katmanında HMAC-SHA256 JWT imza ve rol doğrulaması
- **Yönlendirme & Güvenlik:** Next.js 16 `proxy.ts` (eski `middleware.ts` standardının yerini alan modern vekil katmanı)
- **Durum & Hata Yönetimi:** Kurumsal Autoelite tasarım tokenları ile hazırlanmış `loading.tsx`, `not-found.tsx`, `error.tsx`, `global-error.tsx`
- **Erişilebilirlik (a11y):** WCAG ve web.dev standartlarına uygun semantik etiketleme, ARIA rolleri, klavye ve ekran okuyucu desteği

---

## 📁 Dizin Yapısı

```
frontend/
├── src/
│   ├── app/               # App Router sayfaları, route handler'lar ve hata kabukları
│   │   ├── (public)/      # Ana sayfa, /alisveris, /rentacar, /projelerimiz, /profil...
│   │   ├── admin/         # Yönetici paneli ekranları (araclar, ofisler, muhasebe...)
│   │   ├── actions/       # Server Actions (admin.ts, auth.ts, rental.ts)
│   │   ├── api/           # Route handler'lar (Google OAuth callback vb.)
│   │   ├── error.tsx      # Genel hata yakalayıcı
│   │   ├── loading.tsx    # Yüklenme durumu (skeleton / spinner)
│   │   └── not-found.tsx  # 404 sayfası
│   ├── components/        # Yeniden kullanılabilir arayüz bileşenleri (Navbar, Hero, Modallar)
│   │   └── admin/         # Yönetici kabuğu (AdminShell), tablolar ve yönetim bileşenleri
│   ├── lib/               # API istemcisi, admin ve kullanıcı oturum yardımcıları
│   ├── proxy.ts           # Next.js 16 rota vekil katmanı (yetki denetimi)
│   └── __tests__/         # Otomatik JWT ve vekil güvenlik testleri
├── public/                # Statik varlıklar ve görseller
├── Dockerfile             # Multi-stage standalone üretim Dockerfile'ı
└── package.json           # Bağımlılıklar ve scriptler
```

---

## 🚀 Geliştirme ve Çalıştırma

### 1. Bağımlılıkları Yükleyin
```bash
npm install
```

### 2. Geliştirme Sunucusunu Başlatın
```bash
npm run dev
```
Uygulama varsayılan olarak `http://localhost:3000` adresinde çalışacaktır.

### 3. Üretim Derlemesi (Build)
```bash
npm run build
```
Next.js standalone çıktısı (`output: 'standalone'`) derlenir ve Docker imajı için optimize edilmiş hafif paket üretilir.

### 4. Testleri Çalıştırın
```bash
npm test
```
Admin oturum tokenlarının HMAC-SHA256 imza denetimini, sahte token engellemesini ve süre dolumu testlerini çalıştırır.

### 5. Lint Kontrolü
```bash
npm run lint
```
