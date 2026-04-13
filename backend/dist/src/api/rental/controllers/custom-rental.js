"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ADMIN_SECRET = 'visionarc-secret-google-123';
// Tarih çakışma kontrolü - Aynı araç için aynı tarih aralığında aktif kiralama var mı?
async function checkDateConflict(strapi, carId, startDate, endDate, excludeRentalId) {
    const filters = {
        car: carId,
        rentalStatus: { $notIn: ['bitti', 'iptal'] },
    };
    const rentals = await strapi.documents('api::rental.rental').findMany({
        filters,
        populate: ['car'],
    });
    for (const rental of rentals) {
        if (excludeRentalId && rental.documentId === excludeRentalId)
            continue;
        const rStart = new Date(rental.startDate);
        const rEnd = new Date(rental.requestedEndDate || rental.endDate);
        const newStart = new Date(startDate);
        const newEnd = new Date(endDate);
        // Tarih çakışması: (yeniStart <= mevcutEnd) VE (mevcutStart <= yeniEnd)
        if (newStart <= rEnd && rStart <= newEnd) {
            return true; // Çakışma var
        }
    }
    return false; // Çakışma yok
}
exports.default = {
    // ===== KULLANICI ENDPOINTLERİ =====
    async createRental(ctx) {
        try {
            const { secret, userId, carId, pickupOffice, dropoffOffice, startDate, endDate } = ctx.request.body;
            if (secret !== ADMIN_SECRET)
                return ctx.unauthorized();
            // Aracı kontrol et
            const car = await strapi.documents('api::car.car').findOne({ documentId: carId });
            if (!car || car.isAvailable === false) {
                return ctx.badRequest('Bu araç şu an müsait değil.');
            }
            // Tarih çakışma kontrolü
            const hasConflict = await checkDateConflict(strapi, carId, startDate, endDate);
            if (hasConflict) {
                return ctx.badRequest('Bu araç seçtiğiniz tarihler arasında zaten kirada.');
            }
            const rental = await strapi.documents('api::rental.rental').create({
                data: {
                    user: userId,
                    car: carId,
                    pickupOffice,
                    dropoffOffice,
                    startDate,
                    endDate,
                    rentalStatus: 'bekliyor'
                },
                status: 'published'
            });
            return ctx.send(rental);
        }
        catch (e) {
            return ctx.badRequest('Kiralama oluşturulamadı', { details: e.message });
        }
    },
    async updateRentalStatus(ctx) {
        try {
            const { secret, rentalId, rentalStatus, requestedEndDate } = ctx.request.body;
            if (secret !== ADMIN_SECRET)
                return ctx.unauthorized();
            const updateData = { rentalStatus };
            if (requestedEndDate)
                updateData.requestedEndDate = requestedEndDate;
            const rental = await strapi.documents('api::rental.rental').update({
                documentId: rentalId,
                data: updateData,
                status: 'published'
            });
            return ctx.send(rental);
        }
        catch (e) {
            return ctx.badRequest('Güncelleme yapılamadı', { details: e.message });
        }
    },
    async getMyRentals(ctx) {
        try {
            const { secret, userId } = ctx.request.query;
            if (secret !== ADMIN_SECRET)
                return ctx.unauthorized();
            const rentals = await strapi.documents('api::rental.rental').findMany({
                filters: { user: userId },
                populate: ['car']
            });
            return ctx.send(rentals);
        }
        catch (e) {
            return ctx.badRequest('Kiralamalar getirilemedi', { details: e.message });
        }
    },
    // ===== ADMIN PANEL ENDPOINTLERİ =====
    async adminGetAllRentals(ctx) {
        try {
            const { secret } = ctx.request.query;
            if (secret !== ADMIN_SECRET)
                return ctx.unauthorized();
            const rentals = await strapi.documents('api::rental.rental').findMany({
                populate: ['car', 'user'],
                sort: { createdAt: 'desc' }
            });
            return ctx.send(rentals);
        }
        catch (e) {
            return ctx.badRequest('Kiralamalar listelenemedi', { details: e.message });
        }
    },
    async adminGetStats(ctx) {
        try {
            const { secret } = ctx.request.query;
            if (secret !== ADMIN_SECRET)
                return ctx.unauthorized();
            const allRentals = await strapi.documents('api::rental.rental').findMany({});
            const allCars = await strapi.documents('api::car.car').findMany({});
            const stats = {
                totalCars: allCars.length,
                availableCars: allCars.filter((c) => c.isAvailable !== false).length,
                totalRentals: allRentals.length,
                pending: allRentals.filter((r) => r.rentalStatus === 'bekliyor').length,
                active: allRentals.filter((r) => r.rentalStatus === 'aktif').length,
                extensionRequests: allRentals.filter((r) => r.rentalStatus === 'uzatma_talep').length,
                returnNotices: allRentals.filter((r) => r.rentalStatus === 'iade_bildirildi').length,
                completed: allRentals.filter((r) => r.rentalStatus === 'bitti').length,
                cancelled: allRentals.filter((r) => r.rentalStatus === 'iptal').length,
            };
            return ctx.send(stats);
        }
        catch (e) {
            return ctx.badRequest('İstatistikler alınamadı', { details: e.message });
        }
    },
    async adminApproveRental(ctx) {
        try {
            const { secret, rentalId } = ctx.request.body;
            if (secret !== ADMIN_SECRET)
                return ctx.unauthorized();
            const rental = await strapi.documents('api::rental.rental').update({
                documentId: rentalId,
                data: { rentalStatus: 'aktif' },
                status: 'published'
            });
            return ctx.send(rental);
        }
        catch (e) {
            return ctx.badRequest('Onay başarısız', { details: e.message });
        }
    },
    async adminRejectRental(ctx) {
        try {
            const { secret, rentalId } = ctx.request.body;
            if (secret !== ADMIN_SECRET)
                return ctx.unauthorized();
            const rental = await strapi.documents('api::rental.rental').update({
                documentId: rentalId,
                data: { rentalStatus: 'iptal' },
                status: 'published'
            });
            return ctx.send(rental);
        }
        catch (e) {
            return ctx.badRequest('Red başarısız', { details: e.message });
        }
    },
    async adminApproveExtension(ctx) {
        var _a;
        try {
            const { secret, rentalId } = ctx.request.body;
            if (secret !== ADMIN_SECRET)
                return ctx.unauthorized();
            // Mevcut kaydı çek
            const existing = await strapi.documents('api::rental.rental').findOne({
                documentId: rentalId,
                populate: ['car']
            });
            if (!existing || !existing.requestedEndDate) {
                return ctx.badRequest('Uzatma talebi bulunamadı.');
            }
            // Uzatılan tarihlerle çakışma kontrolü
            const carDocId = (_a = existing.car) === null || _a === void 0 ? void 0 : _a.documentId;
            if (carDocId) {
                const hasConflict = await checkDateConflict(strapi, carDocId, String(existing.endDate), String(existing.requestedEndDate), rentalId);
                if (hasConflict) {
                    return ctx.badRequest('Uzatma tarihleri başka bir kiralama ile çakışıyor.');
                }
            }
            const rental = await strapi.documents('api::rental.rental').update({
                documentId: rentalId,
                data: {
                    endDate: existing.requestedEndDate,
                    requestedEndDate: null,
                    rentalStatus: 'aktif'
                },
                status: 'published'
            });
            return ctx.send(rental);
        }
        catch (e) {
            return ctx.badRequest('Uzatma onayı başarısız', { details: e.message });
        }
    },
    async adminRejectExtension(ctx) {
        try {
            const { secret, rentalId } = ctx.request.body;
            if (secret !== ADMIN_SECRET)
                return ctx.unauthorized();
            const rental = await strapi.documents('api::rental.rental').update({
                documentId: rentalId,
                data: {
                    requestedEndDate: null,
                    rentalStatus: 'aktif'
                },
                status: 'published'
            });
            return ctx.send(rental);
        }
        catch (e) {
            return ctx.badRequest('Uzatma reddi başarısız', { details: e.message });
        }
    },
    async adminCompleteRental(ctx) {
        try {
            const { secret, rentalId } = ctx.request.body;
            if (secret !== ADMIN_SECRET)
                return ctx.unauthorized();
            const rental = await strapi.documents('api::rental.rental').update({
                documentId: rentalId,
                data: { rentalStatus: 'bitti' },
                status: 'published'
            });
            return ctx.send(rental);
        }
        catch (e) {
            return ctx.badRequest('Tamamlama başarısız', { details: e.message });
        }
    },
};
