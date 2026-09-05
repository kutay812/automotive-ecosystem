import { Request, Response, NextFunction } from 'express';

type AsyncFunction = (req: Request | any, res: Response | any, next: NextFunction) => Promise<any>;

/**
 * Express route handler'larını saran ve yakalanmayan hataları otomatik olarak
 * global errorHandler middleware'ine aktaran asenkron sarıcı (wrapper).
 */
export const asyncHandler = (fn: AsyncFunction) => {
  return (req: Request | any, res: Response | any, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
