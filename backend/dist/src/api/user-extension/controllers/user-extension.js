"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    async updateProfile(ctx) {
        try {
            const { userId, firstName, lastName, username, secret } = ctx.request.body;
            // Güvenlik: Sadece Next.js'den gelen istekleri kabul et
            if (secret !== 'visionarc-secret-google-123') {
                return ctx.unauthorized('Invalid secret');
            }
            // Strapi v5 users-permissions eklentisinin entityService mantığı db type mismatch hatalarına yol açtığından, doğrudan Query Engine kullanıyoruz.
            const updatedUser = await strapi.db.query('plugin::users-permissions.user').update({
                where: { id: userId },
                data: {
                    firstName,
                    lastName,
                    username
                },
            });
            return ctx.send(updatedUser);
        }
        catch (err) {
            return ctx.badRequest('Failed to update profile', { moreDetails: err.message });
        }
    }
};
