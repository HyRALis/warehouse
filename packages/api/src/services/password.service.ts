import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';

const SCRYPT_PREFIX = 'scrypt';
const SCRYPT_COST = 32_768;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_MAX_MEMORY = 64 * 1024 * 1024;

const deriveKey = (
    password: string,
    salt: Buffer,
    keyLength: number,
    options: crypto.ScryptOptions
): Promise<Buffer> =>
    new Promise((resolve, reject) => {
        crypto.scrypt(password, salt, keyLength, options, (error, derivedKey) => {
            if (error) reject(error);
            else resolve(derivedKey);
        });
    });

export const isLegacyBcryptHash = (hash: string | null | undefined): boolean =>
    Boolean(hash && /^\$2[aby]\$/.test(hash));

export const hashPassword = async (password: string): Promise<string> => {
    const salt = crypto.randomBytes(16);
    const derivedKey = await deriveKey(password, salt, SCRYPT_KEY_LENGTH, {
        N: SCRYPT_COST,
        r: SCRYPT_BLOCK_SIZE,
        p: SCRYPT_PARALLELIZATION,
        maxmem: SCRYPT_MAX_MEMORY,
    });

    return [
        SCRYPT_PREFIX,
        SCRYPT_COST,
        SCRYPT_BLOCK_SIZE,
        SCRYPT_PARALLELIZATION,
        salt.toString('base64url'),
        derivedKey.toString('base64url'),
    ].join('$');
};

const verifyScryptPassword = async (password: string, hash: string): Promise<boolean> => {
    const [prefix, costValue, blockSizeValue, parallelizationValue, saltValue, keyValue] =
        hash.split('$');
    if (
        prefix !== SCRYPT_PREFIX ||
        !costValue ||
        !blockSizeValue ||
        !parallelizationValue ||
        !saltValue ||
        !keyValue
    ) {
        return false;
    }

    const cost = Number(costValue);
    const blockSize = Number(blockSizeValue);
    const parallelization = Number(parallelizationValue);
    if (
        cost !== SCRYPT_COST ||
        blockSize !== SCRYPT_BLOCK_SIZE ||
        parallelization !== SCRYPT_PARALLELIZATION
    ) {
        return false;
    }

    try {
        const expected = Buffer.from(keyValue, 'base64url');
        const actual = await deriveKey(
            password,
            Buffer.from(saltValue, 'base64url'),
            expected.length,
            {
                N: cost,
                r: blockSize,
                p: parallelization,
                maxmem: SCRYPT_MAX_MEMORY,
            }
        );
        return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
    } catch {
        return false;
    }
};

export const verifyPassword = async ({
    hash,
    password,
}: {
    hash: string;
    password: string;
}): Promise<boolean> => {
    if (isLegacyBcryptHash(hash)) return bcrypt.compare(password, hash);
    return verifyScryptPassword(password, hash);
};
