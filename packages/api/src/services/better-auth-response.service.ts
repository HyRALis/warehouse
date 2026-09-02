import { Response } from 'express';

export const applyBetterAuthHeaders = (response: Response, headers: Headers): void => {
    for (const cookie of headers.getSetCookie()) response.append('Set-Cookie', cookie);
};
