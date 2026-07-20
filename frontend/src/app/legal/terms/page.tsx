import React from 'react';

export default function TermsOfService() {
  return (
    <div className="max-w-4xl mx-auto py-16 px-6 font-inter text-gray-800">
      <h1 className="text-3xl font-bold mb-8">Kullanım Koşulları (Terms of Service)</h1>
      <div className="space-y-6">
        <p className="font-semibold text-red-600 bg-red-50 p-4 rounded-md">
          DİKKAT: Bu web sitesi açık kaynak (open-source) bir örnektir (DEMO). Sitede sunulan hizmetler, fiyatlar, ürünler ve araçlar tamamen hayal ürünüdür. Bu web sitesini kullanarak herhangi bir gerçek alışveriş veya kiralama sözleşmesi yapmadığınızı kabul edersiniz.
        </p>

        <h2 className="text-xl font-semibold mt-6">1. Kabul Edilme Şartları</h2>
        <p>Bu "Example" platformuna erişerek ve kullanarak, bu sitenin sadece eğitim/test amaçlı olduğunu ve herhangi bir hukuki bağlayıcılığı olan ticari işlem yapılamayacağını kabul ediyorsunuz.</p>

        <h2 className="text-xl font-semibold mt-6">2. Sorumluluk Reddi (Disclaimer)</h2>
        <p>Proje sahipleri ve geliştiricileri, bu test platformu üzerinden girilen kişisel bilgilerin sızması, ödeme entegrasyonuna yanlışlıkla gerçek bilgilerin girilerek doğacak maddi veya manevi kayıplarından kesinlikle sorumlu tutulamaz.</p>

        <h2 className="text-xl font-semibold mt-6">3. Fikri Mülkiyet</h2>
        <p>Bu platform açık kaynaklı bir proje olup, kullanılan logolar, markalar (örnek amaçlı e-ticaret firmaları logoları vb.) tamamen örnek (placeholder) teşkil etmektedir. Eğer telif hakkı içeren bir görsel tespit edilirse derhal kaldırılır.</p>

        <h2 className="text-xl font-semibold mt-6">4. Kesinti ve Değişiklikler</h2>
        <p>Geliştirici veya yayıncı, bu test sitesini haber vermeksizin kapatabilir, veritabanını sıfırlayabilir veya siteye erişimi kısıtlayabilir. Bu durumlardan dolayı hiçbir hak iddia edilemez.</p>

        <p className="text-sm text-gray-500 mt-10">Son güncelleme: {new Date().toLocaleDateString('tr-TR')}</p>
      </div>
    </div>
  );
}
