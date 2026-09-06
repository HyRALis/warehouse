import { NextFunction, Request, Response } from 'express';
import { AuthRequest } from './auth';

const defaultErrorCodes: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    413: 'PAYLOAD_TOO_LARGE',
    429: 'RATE_LIMITED',
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

/** Keeps all JSON endpoints on the public success/error envelope. */
export const responseEnvelope = (req: Request, res: Response, next: NextFunction): void => {
    const sendJson = res.json.bind(res);

    res.json = ((body: unknown) => {
        if (!isRecord(body)) return sendJson(body);

        if (res.statusCode >= 400 || body.success === false) {
            return sendJson({
                ...body,
                success: false,
                message: typeof body.message === 'string' ? body.message : 'Request failed',
                code:
                    typeof body.code === 'string'
                        ? body.code
                        : defaultErrorCodes[res.statusCode] || 'REQUEST_FAILED',
                statusCode: res.statusCode,
                requestId: body.requestId || (req as AuthRequest).requestId,
            });
        }

        if (body.success === true && !Object.prototype.hasOwnProperty.call(body, 'data')) {
            return sendJson({ ...body, data: null });
        }

        return sendJson(body);
    }) as Response['json'];

    next();
};
