# VisionArc - Backend API Servisi

VisionArc ekosisteminin iş mantığını, kimlik doğrulama süreçlerini, kiralama yaşam döngüsünü ve veri depolamasını yöneten Express ve TypeScript tabanlı RESTful API servisi.

---

## 🛠️ Teknoloji Yığını

- **Çalışma Ortamı & Dil:** Node.js 22 LTS, TypeScript 5.6
- **Web Çatısı:** Express 4.21
- **Veritabanı:** PostgreSQL 15 (Bağlantı havuzu `pg.Pool`, B-Tree indeksler)
- **Önbellek & Kuyruk:** Redis 7 (`ioredis`, Non-blocking `scanStream` ile anahtar temizleme)
- **Güvenlik & Sertleştirme:**
  - `helmet` ile HTTP güvenlik başlıkları (nosniff, frameguard, CSP vb.)
  - JWT (JSON Web Tokens) ile kullanıcı ve admin oturum yönetimi (HMAC-SHA256)
  - `bcryptjs` ile parola hashleme
  - Katı dosya yükleme denetimi (`uploadSizeGuard`, uzantı/MIME whitelist)
  - Rol tabanlı yetkilendirme (RBAC: `superadmin`, `admin`, `editor`, `authenticated`)
  - `express-rate-limit` ile istek sınırlama
- **E-posta:** Nodemailer 10.3.1 (SMTP entegrasyonu)
- **Test:** Node.js yerleşik test çalıştırıcısı (`node:test`, `tsx --test`)

---

## 📁 Dizin Yapısı

```
backend/
├── src/
│   ├── __tests__/         # Otomatik regresyon, güvenlik ve smoke testleri
│   ├── config/            # Ortam değişkenleri (env.ts), Redis yapılandırması
│   ├── database/          # PostgreSQL bağlantı havuzu ve veritabanı migrasyonları
│   ├── middlewares/       # Auth (RBAC), errorHandler, asyncHandler, upload koruması
│   ├── routes/            # Modüler REST API rotaları (car, rental, office, auth, shop...)
│   ├── services/          # Kiralama servisleri ve ödeme sağlayıcı stratejileri (PaymentProvider)
│   ├── utils/             # Güvenli dinamik SQL (buildUpdateQuery), JWT imzalama, formatlayıcılar
│   ├── create-superadmin.ts # İlk kurulum yönetici oluşturma scripti
│   └── index.ts           # Sunucu giriş noktası ve middleware montajı
├── public/
│   └── uploads/           # Yerel yüklenen medya dosyaları
├── Dockerfile             # Multi-stage/non-root production Docker imajı
├── tsconfig.json          # TypeScript derleme ayarları
└── package.json           # Bağımlılıklar ve npm scriptleri
```

---

## 🚀 Geliştirme ve Çalıştırma

### Gereksinimler
- Node.js 20+ ve npm
- PostgreSQL 15+
- Redis 7+

### 1. Bağımlılıkları Yükleyin
```bash
npm install
```

### 2. Ortam Değişkenlerini Tanımlayın
```bash
cp .env.example .env
```
`.env` içerisindeki veritabanı, Redis ve JWT anahtarlarını yapılandırın.

### 3. Geliştirme Sunucusunu Başlatın
```bash
npm run dev
```
Servis varsayılan olarak `http://localhost:1337` adresinde çalışacaktır. Sağlık kontrolü için `http://localhost:1337/api/health` adresini test edebilirsiniz.

### 4. Testleri Çalıştırın
```bash
npm test
```
Express uygulamasını geçici bir HTTP portunda ayağa kaldırarak güvenlik, RBAC, PII sızıntı engeli ve dosya yükleme sınırlarını otomatik doğrular.

---

## 🔒 Güvenlik Standartları

- **API Yetkilendirme:** Tüm yönetim uçları `requireRole('superadmin', 'admin', 'editor')` koruması altındadır.
- **KVKK / PII Koruması:** `GET /api/rentals` genel uç noktası yalnızca müsaitlik takvimi alanlarını döndürür; hassas kullanıcı verisi içermez.
- **Medya Yükleme Güvenliği:** `/api/admin/media/upload` ve `/api/admin/projects/upload` rotaları yalnızca izin verilen medya uzantılarını (`.jpg`, `.png`, `.webp`, `.mp4`, `.pdf` vb.) kabul eder. HTML, SVG veya script yüklemeleri doğrudan 400 ile engellenir.
