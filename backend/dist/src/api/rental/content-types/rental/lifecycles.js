"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    async afterCreate(event) {
        // Yeni bir kayıt oluşturulduğunda (bekliyor veya aktif), aracı rezerve ediyoruz/kapatıyoruz.
        const { result } = event;
        if (['bekliyor', 'aktif'].includes(result.rentalStatus)) {
            await updateCarAvailability(result.id, false, result.endDate);
        }
    },
    async afterUpdate(event) {
        const { result } = event;
        const { rentalStatus, endDate } = result;
        if (['bekliyor', 'aktif', 'uzatma_talep', 'iade_bildirildi'].includes(rentalStatus)) {
            // Araç kiralandı veya talep edildi, kapatıyoruz.
            await updateCarAvailability(result.id, false, endDate);
        }
        else if (rentalStatus === 'bitti' || rentalStatus === 'iptal') {
            // Araç teslim alındı (veya kiralama iptal edildi), açıyoruz.
            await updateCarAvailability(result.id, true, null);
        }
    }
};
async function updateCarAvailability(rentalId, isAvailable, availableUntil) {
    try {
        // 1. Rental (Kiralama) nesnesinin içine girip hangi araca ait olduğunu buluyoruz.
        const rentalWithCar = await strapi.documents('api::rental.rental').findFirst({
            filters: {
                $or: [
                    { id: rentalId },
                    { documentId: rentalId }
                ]
            },
            populate: ['car']
        });
        if (rentalWithCar && rentalWithCar.car) {
            const carDocId = rentalWithCar.car.documentId;
            const carId = rentalWithCar.car.id;
            // 2. Bulduğumuz aracın isAvailable ve availableUntil alanlarını (Published olarak) güncelliyoruz.
            await strapi.documents('api::car.car').update({
                documentId: carDocId,
                data: {
                    isAvailable: isAvailable,
                    availableUntil: availableUntil
                },
                status: 'published' // v5'te canlı sürümü anında güncellemek için gereklidir!
            });
            console.log(`[Otomasyon] Araç (ID: ${carId}) durumu güncellendi: isAvailable=${isAvailable}`);
        }
    }
    catch (error) {
        console.error('[Otomasyon Hatası] Araç durumu güncellenemedi:', error);
    }
}
