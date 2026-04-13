"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    routes: [
        {
            method: 'POST',
            path: '/user-extension/update-profile',
            handler: 'user-extension.updateProfile',
            config: {
                auth: false,
            },
        },
    ],
};
