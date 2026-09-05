export const DEFAULT_RETURN_TO = '/dashboard';

/**
 * `returnTo` arrives from a query string, so it is attacker-controlled. Only same-origin
 * absolute paths are honoured; a scheme, host, or protocol-relative `//host` falls back.
 */
export const safeReturnTo = (value: string | null | undefined): string =>
    value?.startsWith('/') && !value.startsWith('//') ? value : DEFAULT_RETURN_TO;
