"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    register( /* { strapi }: { strapi: Core.Strapi } */) { },
    async bootstrap({ strapi }) {
        try {
            const pluginStore = strapi.store({ type: 'plugin', name: 'users-permissions' });
            // =====================================================
            // 1. GOOGLE CALLBACK MIDDLEWARE (Koa)
            // Strapi 5'te providers-registry çalışmıyor.
            // Bu yüzden Koa middleware ile araya giriyoruz.
            // =====================================================
            strapi.server.use(async (ctx, next) => {
                var _a;
                await next(); // Önce Strapi kendi işini yapsın
                // Sadece Google callback'i yakala ve başarılıysa devam et
                if (ctx.url.startsWith('/api/auth/google/callback') &&
                    ctx.status === 200 &&
                    ((_a = ctx.body) === null || _a === void 0 ? void 0 : _a.jwt)) {
                    const accessToken = ctx.query.access_token;
                    if (!accessToken)
                        return;
                    try {
                        // Google'dan profil verisini doğrudan çek
                        const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                            headers: { Authorization: `Bearer ${accessToken}` }
                        });
                        const profile = await response.json();
                        // KARA KUTU: Google'dan gelen ham veri
                        console.log('=== GOOGLE BLACKBOX START ===');
                        console.log(JSON.stringify(profile, null, 2));
                        console.log('=== GOOGLE BLACKBOX END ===');
                        if (profile.email) {
                            const firstName = profile.given_name || '';
                            const lastName = profile.family_name || '';
                            const fullName = profile.name || `${firstName} ${lastName}`.trim();
                            const displayUsername = fullName || profile.email.split('@')[0];
                            const user = await strapi.db.query('plugin::users-permissions.user').findOne({
                                where: { email: profile.email }
                            });
                            if (user) {
                                await strapi.db.query('plugin::users-permissions.user').update({
                                    where: { id: user.id },
                                    data: {
                                        firstName,
                                        lastName,
                                        username: displayUsername
                                    }
                                });
                                console.log(`✅ Google Profil Senkronize: ${profile.email} -> ${displayUsername}`);
                            }
                        }
                    }
                    catch (err) {
                        console.error('⚠️ Google profil çekme hatası:', err.message);
                    }
                }
            });
            // =====================================================
            // 2. Google Sağlayıcı Ayarları + Kayıt İzni
            // =====================================================
            let grantConfig = await pluginStore.get({ key: 'grant' });
            if (!grantConfig)
                grantConfig = {};
            grantConfig.google = {
                enabled: true,
                key: process.env.GOOGLE_CLIENT_ID,
                secret: process.env.GOOGLE_CLIENT_SECRET,
                scope: ['email', 'profile'],
                callback: '/api/auth/google/callback',
                params: {
                    prompt: 'consent',
                    access_type: 'offline'
                }
            };
            await pluginStore.set({ key: 'grant', value: grantConfig });
            let advancedConfig = await pluginStore.get({ key: 'advanced' });
            if (!advancedConfig)
                advancedConfig = {};
            advancedConfig.allow_register = true;
            advancedConfig.unique_email = true;
            advancedConfig.email_confirmation = false;
            await pluginStore.set({ key: 'advanced', value: advancedConfig });
            // =====================================================
            // 3. OAuth & API İzinleri (403 Koruması)
            // =====================================================
            const forcePermission = async (roleType, action) => {
                const role = await strapi.db.query('plugin::users-permissions.role').findOne({
                    where: { type: roleType }
                });
                if (!role)
                    return;
                const existing = await strapi.db.query('plugin::users-permissions.permission').findOne({
                    where: { action, role: role.id }
                });
                if (!existing) {
                    await strapi.db.query('plugin::users-permissions.permission').create({
                        data: { action, role: role.id }
                    });
                    console.log(`🔓 ${action} -> ${roleType}`);
                }
            };
            // OAuth izinleri
            await forcePermission('public', 'plugin::users-permissions.auth.callback');
            await forcePermission('public', 'plugin::users-permissions.auth.connect');
            await forcePermission('authenticated', 'plugin::users-permissions.auth.callback');
            await forcePermission('authenticated', 'plugin::users-permissions.auth.connect');
            await forcePermission('authenticated', 'plugin::users-permissions.user.me');
            // API izinleri
            const publicApis = ['api::car.car', 'api::office.office', 'api::production-project.production-project'];
            for (const api of publicApis) {
                await forcePermission('public', `${api}.find`);
                await forcePermission('public', `${api}.findOne`);
                await forcePermission('authenticated', `${api}.find`);
                await forcePermission('authenticated', `${api}.findOne`);
            }
            await forcePermission('authenticated', 'api::rental.rental.find');
            await forcePermission('authenticated', 'api::rental.rental.findOne');
            await forcePermission('authenticated', 'api::rental.rental.create');
            console.log('✅ VisionArc: Koa Middleware + İzinler + OAuth Kilitlendi.');
        }
        catch (e) {
            console.error('Bootstrap kritik hata:', e);
        }
    },
};
