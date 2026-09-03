import bcrypt from 'bcryptjs';
import {
    hashPassword,
    isLegacyBcryptHash,
    verifyPassword,
} from '../src/services/password.service';

describe('password migration policy', () => {
    it('hashes new passwords with scrypt and verifies them in constant-time comparison code', async () => {
        const hash = await hashPassword('a-long-and-secure-password');

        expect(hash).toMatch(/^scrypt\$32768\$8\$1\$/);
        await expect(
            verifyPassword({ hash, password: 'a-long-and-secure-password' })
        ).resolves.toBe(true);
        await expect(verifyPassword({ hash, password: 'wrong-password' })).resolves.toBe(false);
    });

    it('accepts a migrated bcrypt hash without treating malformed values as credentials', async () => {
        const hash = await bcrypt.hash('legacy-password', 4);

        expect(isLegacyBcryptHash(hash)).toBe(true);
        await expect(verifyPassword({ hash, password: 'legacy-password' })).resolves.toBe(true);
        await expect(verifyPassword({ hash: 'not-a-hash', password: 'legacy-password' })).resolves.toBe(
            false
        );
    });
});
