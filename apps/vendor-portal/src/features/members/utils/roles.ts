/** Better Auth stores roles as a comma-separated list, so `owner` needs an exact segment match. */
export const isOwnerRole = (role: string): boolean =>
    role
        .split(',')
        .map((entry) => entry.trim())
        .includes('owner');
