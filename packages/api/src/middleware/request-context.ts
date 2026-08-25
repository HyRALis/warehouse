import crypto from 'crypto';
import { NextFunction, Response } from 'express';
import { AuthRequest } from './auth';
import { config } from '../config';

export const requestContext = (req: AuthRequest, res: Response, next: NextFunction): void => {
    const requestId = crypto.randomUUID();
    const startedAt = Date.now();

    req.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);

    if (config.nodeEnv !== 'test') {
        res.on('finish', () => {
            console.log(
                JSON.stringify({
                    level: 'info',
                    event: 'request_completed',
                    requestId,
                    method: req.method,
                    path: req.originalUrl,
                    statusCode: res.statusCode,
                    durationMs: Date.now() - startedAt,
                })
            );
        });
    }

    next();
};
