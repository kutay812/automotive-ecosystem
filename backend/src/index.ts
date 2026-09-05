import fs from 'fs';
process.on('uncaughtException', (err) => { 
  fs.writeFileSync('error.log', 'UNCAUGHT: ' + err.stack);
  console.error('🔥 KRİTİK HATA (Uncaught):', err);
});
process.on('unhandledRejection', (reason: any) => { 
  fs.writeFileSync('error.log', 'UNHANDLED: ' + (reason?.stack || reason));
  console.error('🔥 KRİTİK HATA (Unhandled):', reason);
});

console.log('🏁 Backend süreci başlıyor...');

import express from 'express';
import cors from 'cors';
import path from 'path';
import { PORT, FRONTEND_URL } from './config/env';
import { initDatabase, runMigrations } from './database/migrations';
import { sanitizeInput } from './middlewares/auth';
import { now } from './utils/helpers';

// Route Modülleri
import { authRouter } from './routes/auth.routes';
import { userRouter } from './routes/user.routes';
import { carRouter } from './routes/car.routes';
import { rentalRouter } from './routes/rental.routes';
import { officeRouter } from './routes/office.routes';
import { financeRouter } from './routes/finance.routes';
import { shopRouter } from './routes/shop.routes';
import { leadRouter } from './routes/lead.routes';
import { mediaRouter } from './routes/media.routes';
import { projectRouter } from './routes/project.routes';
import { adminRouter } from './routes/admin.routes';
import { supportRouter } from './routes/support.routes';

const app = express();

// Global Middleware'ler
app.use(express.json());
app.use(sanitizeInput);
app.use(cors({ origin: [FRONTEND_URL, 'http://localhost:3000'], credentials: true }));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Statik Yüklemeler
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Sağlık Kontrolü
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: now() });
});

// Route'ların /api altına bağlanması
import { errorHandler } from './middlewares/errorHandler';

app.use('/api', authRouter);
app.use('/api', userRouter);
app.use('/api', carRouter);
app.use('/api', rentalRouter);
app.use('/api', officeRouter);
app.use('/api', financeRouter);
app.use('/api', shopRouter);
app.use('/api', leadRouter);
app.use('/api', mediaRouter);
app.use('/api', projectRouter);
app.use('/api', adminRouter);
app.use('/api', supportRouter);

// Global Error Handler
app.use(errorHandler);

// Veritabanı Başlatma ve Sunucu Dinleme
async function startServer() {
  await initDatabase();
  await runMigrations();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Backend başarıyla başlatıldı: http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('🔥 Sunucu başlatılırken kritik hata:', err);
  process.exit(1);
});

export default app;
