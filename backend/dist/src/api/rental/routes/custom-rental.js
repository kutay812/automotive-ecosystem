"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    routes: [
        {
            method: 'POST',
            path: '/rental-operations/create',
            handler: 'custom-rental.createRental',
            config: { auth: false },
        },
        {
            method: 'POST',
            path: '/rental-operations/update-status',
            handler: 'custom-rental.updateRentalStatus',
            config: { auth: false },
        },
        {
            method: 'GET',
            path: '/rental-operations/my-rentals',
            handler: 'custom-rental.getMyRentals',
            config: { auth: false },
        },
        // ===== ADMIN PANEL ENDPOINTLERİ =====
        {
            method: 'GET',
            path: '/rental-operations/admin/all',
            handler: 'custom-rental.adminGetAllRentals',
            config: { auth: false },
        },
        {
            method: 'GET',
            path: '/rental-operations/admin/stats',
            handler: 'custom-rental.adminGetStats',
            config: { auth: false },
        },
        {
            method: 'POST',
            path: '/rental-operations/admin/approve',
            handler: 'custom-rental.adminApproveRental',
            config: { auth: false },
        },
        {
            method: 'POST',
            path: '/rental-operations/admin/reject',
            handler: 'custom-rental.adminRejectRental',
            config: { auth: false },
        },
        {
            method: 'POST',
            path: '/rental-operations/admin/approve-extension',
            handler: 'custom-rental.adminApproveExtension',
            config: { auth: false },
        },
        {
            method: 'POST',
            path: '/rental-operations/admin/reject-extension',
            handler: 'custom-rental.adminRejectExtension',
            config: { auth: false },
        },
        {
            method: 'POST',
            path: '/rental-operations/admin/complete',
            handler: 'custom-rental.adminCompleteRental',
            config: { auth: false },
        },
    ],
};
