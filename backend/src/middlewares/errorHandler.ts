import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  details?: any;
}

/**
 * Global Express hata yakalama middleware'i.
 * Hataları loglar ve istemciye standart hata yanıt formatında döner.
 */
export const errorHandler = (err: AppError, req: Request, res: Response, _next: NextFunction) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Sunucu hatası oluştu.';

  console.error(`[EXPRESS ERROR] ${req.method} ${req.originalUrl}:`, err.message || err);

  res.status(statusCode).json({
    error: {
      message,
      ...(err.details ? { details: err.details } : {}),
    },
  });
};
