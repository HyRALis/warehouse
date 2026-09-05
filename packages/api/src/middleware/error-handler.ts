import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { AuthRequest } from './auth';

/**
 * Global Express error handler
 */
export const errorHandler = (
    err: Error & { statusCode?: number; code?: string },
    req: Request,
    res: Response,
    _next: NextFunction
): void => {
    const requestId = (req as AuthRequest).requestId;
    console.error(
        JSON.stringify({
            level: 'error',
            event: 'request_failed',
            requestId,
            message: err.message,
            stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
        })
    );

    const statusCode = err instanceof multer.MulterError ? 400 : err.statusCode || 500;
    // Unexpected storage/database errors can contain SQL, credentials, or filesystem paths.
    const message = statusCode >= 500 ? 'Internal Server Error' : err.message || 'Request failed';
    const code = statusCode >= 500
        ? 'INTERNAL_SERVER_ERROR'
        : err instanceof multer.MulterError ? 'UPLOAD_ERROR' : err.code || 'REQUEST_FAILED';

    res.status(statusCode).json({
        success: false,
        message,
        code,
        statusCode,
        requestId,
    });
};
