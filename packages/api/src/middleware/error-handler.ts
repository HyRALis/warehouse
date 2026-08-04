import { Request, Response, NextFunction } from 'express';

/**
 * Global Express error handler
 */
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction): void => {
  console.error(err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const code = err.code || 'INTERNAL_SERVER_ERROR';

  res.status(statusCode).json({
    message,
    code,
    statusCode
  });
};
