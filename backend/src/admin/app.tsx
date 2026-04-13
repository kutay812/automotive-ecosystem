import type { StrapiApp } from '@strapi/strapi/admin';

const trTranslations = {
  "Auth.form.email.label": "E-posta",
  "Auth.form.password.label": "Şifre",
  "Auth.form.rememberMe.label": "Beni Hatırla",
  "Auth.form.button.login": "Giriş Yap",
  "global.content-manager": "İçerik Yöneticisi",
  "global.content-type-builder": "İçerik Tipi Oluşturucu",
  "global.media-library": "Medya Kütüphanesi",
  "global.settings": "Ayarlar",
  "global.plugins": "Eklentiler",
  "global.marketplace": "Pazar Yeri",
  "app.components.LeftMenu.navbrand.title": "VisionArc Yönetim",
  "app.components.LeftMenu.navbrand.workplace": "Çalışma Alanı",
  "content-manager.components.LeftMenu.collection-types": "Koleksiyon Tipleri",
  "content-manager.components.LeftMenu.single-types": "Tekil Tipler",
  "content-manager.HeaderLayout.button.label-add-entry": "Yeni Kayıt Ekle",
  "content-type-builder.plugin.name": "İçerik Tipi Oluşturucu",
  "Settings.profile.form.section.experience.interfaceLanguage": "Arayüz Dili",
  "Settings.profile.form.section.experience.mode.label": "Arayüz Teması",
  "app.components.HomePage.welcome.Block.title": "VisionArc Sistemine Hoş Geldiniz!",
  "app.components.HomePage.welcome.Block.content": "Tüm içerikleri, araçları ve projeleri buradan yönetebilirsiniz.",
  "Settings.profile.form.section.experience.mode.hint": "Arayüz rengini tercihinize göre değiştirebilirsiniz.",
  "global.content-manager": "İçerik Yönetimi",
  "global.media-library": "Görsel Arşivi",
  "global.plugins": "Eklenti Merkezi",
  "global.settings": "Sistem Ayarları",
  "global.marketplace": "Uygulama Mağazası",
  "content-manager.containers.List.addCustomColumn": "Özel Sütun Ekle",
  "content-manager.containers.Edit.delete": "Kaydı Sil",
  "content-manager.containers.Edit.publish": "Yayına Al",
  "content-manager.containers.Edit.unpublish": "Yayından Kaldır",
  "content-manager.containers.Edit.save": "Kaydet",
  "app.components.LeftMenu.navbrand.title": "VisionArc Admin",
  "app.components.LeftMenu.navbrand.workplace": "Kurumsal Yönetim",
};

export default {
  config: {
    locales: ['tr'],
    translations: {
      tr: trTranslations
    },
    tutorials: false,
    notifications: { release: false },
  },
  bootstrap(app: StrapiApp) {
    // VisionArc Özel CSS Enjeksiyonu
    const style = document.createElement('style');
    style.innerHTML = `
      /* Admin Badge Renklendirme */
      
      /* Bekliyor (Onay Süreci) - Turuncu/Sarı */
      span[data-status="bekliyor"] { 
        background-color: #fef3c7 !important; 
        color: #92400e !important; 
        border: 1px solid #fde68a !important; 
        font-weight: bold !important;
      }
      
      /* Aktif (Kullanımda) - Yeşil */
      span[data-status="aktif"] { 
        background-color: #dcfce7 !important; 
        color: #166534 !important; 
        border: 1px solid #bbf7d0 !important; 
        font-weight: bold !important;
      }
      
      /* Uzatma Talebi - Mavi */
      span[data-status="uzatma_talep"] { 
        background-color: #dbeafe !important; 
        color: #1e40af !important; 
        border: 1px solid #bfdbfe !important; 
        font-weight: bold !important;
      }
      
      /* İade Bildirildi - Mor/Eflatun */
      span[data-status="iade_bildirildi"] { 
        background-color: #f3e8ff !important; 
        color: #6b21a8 !important; 
        border: 1px solid #e9d5ff !important; 
        font-weight: bold !important;
      }
      
      /* Bitti/Tamamlandı - Gri */
      span[data-status="bitti"] { 
        background-color: #f3f4f6 !important; 
        color: #374151 !important; 
        border: 1px solid #e5e7eb !important;
      }
      
      /* İptal - Kırmızı */
      span[data-status="iptal"] { 
        background-color: #fee2e2 !important; 
        color: #991b1b !important; 
        border: 1px solid #fecaca !important;
      }

      /* Dashboard Logo ve İsim İyileştirmeleri */
      header h1 { font-family: 'Inter', sans-serif !important; letter-spacing: -0.5px !important; }
    `;
    document.head.appendChild(style);
    
    console.log("VisionArc Admin Experience initialized.");
  },
};
