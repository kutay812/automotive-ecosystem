# Example - Kurumsal Ekosistem Yönetim Sistemi

![Banner Resmi](https://via.placeholder.com/1200x300.png?text=Example+Project)

> E-ticaret, Araç Kiralama (Rent A Car) ve Prodüksiyon hizmetlerini tek bir uygulama mimarisinde birleştiren, kurumsal seviyede modern bir ekosistem yönetim platformu.

## 🚀 Özellikler

- **Çoklu Hizmet Mimarisi**: Tek bir uygulamadan farklı iş sektörlerine birleşik erişim.
- **E-Ticaret Platformu**: Büyük online mağazalara doğrudan bağlantı içeren entegre pazar yeri.
- **Araç Kiralama Sistemi**: Yönetici paneliyle entegre çalışan tam kapsamlı araç kiralama (rent a car) sistemi.
- **Prodüksiyon Hizmetleri**: Medya ve prodüksiyon hizmetleri için modern arayüzlü tanıtım sayfaları.
- **Yönetici Paneli (Admin Dashboard)**: Kiralamaları, finansı ve genel uygulamayı yönetmek için kapsamlı bir yönetim arayüzü.
- **Modern UI/UX**: React/Next.js ile oluşturulmuş, mikro-animasyonlar ve glassmorphism tasarımlara sahip güzel, duyarlı ve dinamik kullanıcı arayüzleri.
- **Güçlü Backend**: Kimlik doğrulama, veritabanı işlemleri ve iş mantığını yöneten Node.js & Koa (Express tabanlı) arka uç API'si.
- **Docker Desteği**: Kolay kurulum ve yayına alma (deployment) için hazır Docker compose konfigürasyonu.

## 🛠️ Teknoloji Yığını (Tech Stack)

**Frontend:**
- [Next.js](https://nextjs.org/) (React Framework)
- TailwindCSS (Stil)
- TypeScript

**Backend:**
- [Node.js](https://nodejs.org/)
- [Express / Koa](https://expressjs.com/) Framework
- [PostgreSQL](https://www.postgresql.org/) (Veritabanı)
- Redis (Önbellekleme & Kuyruk Yönetimi)
- TypeScript

**Altyapı:**
- Docker & Docker Compose
- Nginx (Reverse Proxy)

## 📦 Gereksinimler

Kuruluma başlamadan önce bilgisayarınızda aşağıdakilerin kurulu olduğundan emin olun:
- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)
- [Node.js](https://nodejs.org/en/download/) (v18 veya üzeri) - *Docker olmadan yerel kurulum yapacaksanız*
- [npm](https://www.npmjs.com/) veya [yarn](https://yarnpkg.com/)

## ⚡ Kurulum ve Başlangıç

Uygulamayı çalıştırmanın en kolay yolu Docker kullanmaktır.

### 1. Repoyu bilgisayarınıza indirin (Clone)

```bash
git clone https://github.com/kullaniciadiniz/example.git
cd example
```

### 2. Ortam Değişkenleri (Environment Variables)

Hem `frontend` hem de `backend` klasörlerinde bulunan `.env.example` şablonlarını kullanarak gerekli `.env` dosyalarını oluşturun.

Hızlı kurulum için, `docker-compose.yml` içinde sağlanan varsayılan değişkenleri kullanabilirsiniz.

### 3. Google OAuth Kurulumu (Google ile Giriş İçin)

Google ile giriş yapabilmek için Google Cloud Console üzerinden bir OAuth Client ID oluşturmanız gerekmektedir:
1. [Google Cloud Console](https://console.cloud.google.com/) adresine gidin.
2. Yeni bir proje oluşturun veya mevcut bir projeyi seçin.
3. `APIs & Services > Credentials` menüsüne gidin.
4. `Create Credentials > OAuth client ID` seçeneğini tıklayın.
5. Application type olarak `Web application` seçin.
6. **Authorized JavaScript origins** kısmına uygulamanızın URL'sini ekleyin (örn: `http://localhost:3000`).
7. **Authorized redirect URIs** kısmına backend geri dönüş URL'sini ekleyin (örn: `http://localhost:1337/api/connect/google/callback`).
8. Oluşturulan **Client ID** ve **Client Secret** değerlerini `backend/.env` dosyanıza ekleyin:
   ```env
   GOOGLE_CLIENT_ID=sizin-client-id-degeriniz
   GOOGLE_CLIENT_SECRET=sizin-client-secret-degeriniz
   ```

### 4. Docker Compose ile Çalıştırma

Tüm konteynerleri (Frontend, Backend, Veritabanı, Redis, Nginx) oluşturmak ve başlatmak için ana klasörde aşağıdaki komutu çalıştırın:

```bash
docker-compose up -d --build
```

Servisler aşağıdaki adreslerde çalışmaya başlayacaktır:
- **Frontend Uygulaması**: `http://localhost:3000`
- **Backend API**: `http://localhost:1337`
- **PostgreSQL**: `localhost:5432`

### 5. Konteynerleri Durdurma

```bash
docker-compose down
```

## 💻 Manuel Yerel Kurulum (Docker Olmadan)

Servisleri bilgisayarınızda manuel olarak çalıştırmayı tercih ederseniz:

### Backend Kurulumu
```bash
cd backend
npm install
npm run dev
```

### Frontend Kurulumu
```bash
cd frontend
npm install
npm run dev
```

## 🔒 Varsayılan Yönetici Girişi

Projeyi ilk kez kurduğunuzda otomatik olarak bir süper yönetici (super admin) hesabı oluşturulacaktır.

- **E-posta**: `admin@example.com`
- **Şifre**: `admin123456`

> [!IMPORTANT]
> **Şifrenizi Nasıl Değiştirirsiniz?**
> Güvenliğiniz için kurulumu tamamladıktan sonra varsayılan şifrenizi mutlaka değiştirin:
> 1. Sistemi ilk kez ayağa kaldırmadan önce `backend/.env` dosyanıza `SA_PASSWORD=yeniSifreniz` satırını ekleyebilirsiniz.
> 2. Veya sisteme varsayılan şifreyle giriş yaptıktan sonra yönetim paneli ayarlarından şifrenizi güncelleyebilirsiniz.

## 💳 Online Ödeme Entegrasyonu (Stripe / Iyzico)

Sistem gerçek API tabanlı online ödeme entegrasyonu için hazır hale getirilmiştir. Şu anda güvenli bir test (dummy) webhook'u kullanmaktadır. Gerçek bir sağlayıcıya (**Stripe** veya **Iyzico**) geçiş yapmak için:

1. **Frontend:** `frontend/src/app/actions/rental.ts` dosyasını, doğrudan başarılı webhook çağırmak yerine kullanıcıyı ödeme sağlayıcınızın güvenli ödeme (checkout) sayfasına yönlendirecek şekilde güncelleyin.
2. **Backend:** `backend/src/index.ts` içindeki webhook uç noktası (`/api/rental-operations/payment/success`) zaten HMAC doğrulaması (`PAYMENT_WEBHOOK_SECRET`) ile güvence altına alınmıştır. Buradaki imza çıkarma (signature extraction) mantığını sağlayıcınızın formatıyla (ör. `Stripe-Signature` veya `x-iyzico-signature`) eşleşecek şekilde değiştirin.
3. **Konfigürasyon:** Sağlayıcınızın API anahtarlarını `.env` dosyasına ekleyin ve canlı ortamda (production) `PAYMENT_WEBHOOK_SECRET` değişkenini ayarlayın. Böylece backend, kiralamaları onaylamadan önce ödemelerin başarısını güvenli bir şekilde doğrulayabilir.


## 📄 Lisans

Bu proje MIT Lisansı altında lisanslanmıştır - daha fazla detay için [LICENSE](LICENSE) dosyasına bakınız.

---

*Modern kurumsal çözümler için tasarlanmış ve geliştirilmiştir.*
