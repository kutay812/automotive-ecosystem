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
};

export default {
  config: {
    locales: [
      'tr',
    ],
    translations: {
      tr: trTranslations
    },
    tutorials: false,
    notifications: { release: false },
  },
  bootstrap(app: StrapiApp) {
    console.log(app);
  },
};
