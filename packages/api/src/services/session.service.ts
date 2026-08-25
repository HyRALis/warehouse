import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface SessionPayload {
    id: string;
    tokenVersion: number;
}

const cookieOptions = {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax' as const,
    path: '/',
};

export const signSession = (vendorId: string, tokenVersion: number): string =>
    jwt.sign({ id: vendorId, tokenVersion }, config.jwtSecret, { expiresIn: '7d' });

export const setSessionCookie = (res: Response, token: string): void => {
    res.cookie(config.sessionCookieName, token, {
        ...cookieOptions,
        maxAge: config.sessionDurationMs,
    });
};

export const clearSessionCookie = (res: Response): void => {
    res.clearCookie(config.sessionCookieName, cookieOptions);
};

const parseCookies = (cookieHeader?: string): Record<string, string> => {
    if (!cookieHeader) return {};

    return cookieHeader.split(';').reduce<Record<string, string>>((cookies, pair) => {
        const separatorIndex = pair.indexOf('=');
        if (separatorIndex === -1) return cookies;

        const key = pair.slice(0, separatorIndex).trim();
        const value = pair.slice(separatorIndex + 1).trim();
        if (key) cookies[key] = decodeURIComponent(value);
        return cookies;
    }, {});
};

export const getSessionToken = (req: Request): string | undefined => {
    const authorization = req.headers.authorization;
    if (authorization?.startsWith('Bearer ')) return authorization.slice(7);

    return parseCookies(req.headers.cookie)[config.sessionCookieName];
};
