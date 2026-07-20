import React from 'react';

export default function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto py-16 px-6 font-inter text-gray-800">
      <h1 className="text-3xl font-bold mb-8">Gizlilik Politikası (Privacy Policy)</h1>
      <div className="space-y-6">
        <p className="font-semibold text-red-600 bg-red-50 p-4 rounded-md">
          DİKKAT: Bu web sitesi yalnızca bir eğitim/geliştirme örneğidir (DEMO). Hiçbir şekilde gerçek bir hizmet, e-ticaret satışı veya araç kiralama operasyonu gerçekleştirmemektedir. Gerçek kişisel verilerinizi paylaşmayınız.
        </p>

        <h2 className="text-xl font-semibold mt-6">1. Toplanan Veriler</h2>
        <p>Sisteme kayıt olduğunuzda veya form doldurduğunuzda; adınız, soyadınız, e-posta adresiniz, telefon numaranız ve şifreniz sistemde (yerel veritabanında) saklanabilir. Bu veriler sadece demoyu test etmek amacıyladır.</p>

        <h2 className="text-xl font-semibold mt-6">2. Verilerin Kullanımı</h2>
        <p>Toplanan test verileri hiçbir üçüncü şahısla paylaşılmaz, ticari bir amaç için kullanılmaz ve pazarlama materyalleri gönderimi yapılmaz.</p>

        <h2 className="text-xl font-semibold mt-6">3. Ödeme Bilgileri</h2>
        <p>Sistemde ödeme işlem adımları bulunmakla birlikte, gerçek bir kredi kartı işlemi gerçekleşmemektedir. Demo testleri için sahte (test) ödeme entegrasyonu kullanılmıştır. Lütfen gerçek kredi kartı veya banka hesap bilgilerinizi bu sistemde kullanmayın.</p>

        <h2 className="text-xl font-semibold mt-6">4. Kullanıcı Hakları</h2>
        <p>Bu sistem sadece geliştirme amaçlı açık kaynak kodlu bir projedir. Hesabınızı ve test verilerinizi silmek isterseniz sistem yöneticisine ulaşabilir veya veritabanı kurulumunu sıfırlayabilirsiniz.</p>

        <p className="text-sm text-gray-500 mt-10">Son güncelleme: {new Date().toLocaleDateString('tr-TR')}</p>
      </div>
    </div>
  );
}
