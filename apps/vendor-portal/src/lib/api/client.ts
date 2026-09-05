import { apiErrorResponseSchema, type ApiIssue } from '@inventory-system/contracts';
import type { z } from 'zod';

export class ApiError extends Error {
    constructor(
        message: string,
        readonly statusCode: number,
        readonly code: string,
        readonly requestId?: string,
        readonly issues?: ApiIssue[]
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

type RequestOptions = Omit<RequestInit, 'body'> & { body?: unknown };

export interface ApiClient {
    request<TSchema extends z.ZodTypeAny>(
        path: string,
        schema: TSchema,
        options?: RequestOptions
    ): Promise<z.infer<TSchema>>;
    download(path: string, options?: RequestInit): Promise<Blob>;
}

const parseError = async (response: Response): Promise<ApiError> => {
    const payload = await response.json().catch(() => null);
    const parsed = apiErrorResponseSchema.safeParse(payload);

    if (parsed.success) {
        return new ApiError(
            parsed.data.message,
            parsed.data.statusCode,
            parsed.data.code,
            parsed.data.requestId,
            parsed.data.issues
        );
    }

    return new ApiError('An unexpected error occurred', response.status, 'UNEXPECTED_RESPONSE');
};

export const createApiClient = (
    baseUrl: string,
    defaultHeaders: HeadersInit | (() => Promise<HeadersInit>) = {}
): ApiClient => {
    const buildHeaders = async (options: RequestOptions): Promise<Headers> => {
        const resolvedDefaults =
            typeof defaultHeaders === 'function' ? await defaultHeaders() : defaultHeaders;
        const headers = new Headers(resolvedDefaults);
        new Headers(options.headers).forEach((value, key) => headers.set(key, value));

        if (options.body !== undefined && !(options.body instanceof FormData)) {
            headers.set('Content-Type', 'application/json');
        }
        return headers;
    };

    const execute = async (path: string, options: RequestOptions = {}): Promise<Response> => {
        const headers = await buildHeaders(options);
        const body =
            options.body === undefined || options.body instanceof FormData
                ? options.body
                : JSON.stringify(options.body);

        return fetch(`${baseUrl}${path}`, {
            ...options,
            body: body as BodyInit | null | undefined,
            headers,
            credentials: 'include',
            cache: 'no-store',
        });
    };

    return {
        async request(path, schema, options = {}) {
            const response = await execute(path, options);
            if (!response.ok) throw await parseError(response);

            const payload: unknown = await response.json();
            const parsed = schema.safeParse(payload);
            if (!parsed.success) {
                throw new ApiError(
                    'The server returned an invalid response',
                    502,
                    'INVALID_API_RESPONSE',
                    response.headers.get('x-request-id') || undefined
                );
            }
            return parsed.data;
        },

        async download(path, options = {}) {
            const response = await execute(path, options);
            if (!response.ok) throw await parseError(response);
            return response.blob();
        },
    };
};

export const getErrorMessage = (error: unknown, fallback = 'Something went wrong'): string =>
    error instanceof Error ? error.message : fallback;

const issuePath = (path: (string | number)[]): string =>
    path
        .filter((segment, index) => index > 0 || !['body', 'query', 'params'].includes(String(segment)))
        .reduce<string>((result, segment) =>
            typeof segment === 'number' ? `${result}[${segment}]` : `${result}${result ? '.' : ''}${segment}`, '');

export const getFieldIssue = (error: unknown, fieldName: string): string | undefined =>
    error instanceof ApiError
        ? error.issues?.find((issue) => issuePath(issue.path) === fieldName)?.message
        : undefined;
