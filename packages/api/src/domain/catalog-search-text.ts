/**
 * Search text is denormalized onto the row so listing queries stay a single indexed scan.
 * Both builders lower-case with `toLocaleLowerCase` so non-ASCII names fold predictably.
 */
export const categorySearchText = (
    name: string,
    aliases: string[] = [],
    parentName?: string
): string => [name, ...aliases, parentName].filter(Boolean).join(' ').trim().toLocaleLowerCase();

export const templateSearchText = (name: string, fields: unknown): string =>
    `${name} ${JSON.stringify(fields)}`.trim().toLocaleLowerCase();
