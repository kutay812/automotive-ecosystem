"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = ({ env }) => ({
    'users-permissions': {
        config: {
            grant: {
                google: {
                    enabled: true,
                    key: env('GOOGLE_CLIENT_ID'),
                    secret: env('GOOGLE_CLIENT_SECRET'),
                    scope: ['email', 'profile'],
                    params: {
                        prompt: 'consent',
                        access_type: 'offline'
                    }
                }
            },
            callback: {
                validate: (cbUrl) => {
                    const allowed = [
                        'http://localhost/callback/google',
                        'http://localhost:3000/callback/google',
                        'http://localhost:3001/callback/google'
                    ];
                    return allowed.includes(cbUrl);
                }
            },
            register: {
                allowedFields: ['firstName', 'lastName'],
            }
        }
    }
});
exports.default = config;
