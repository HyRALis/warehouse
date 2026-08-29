import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import typescriptEslint from '@typescript-eslint/eslint-plugin';

export default defineConfig([
    ...nextVitals,
    {
        plugins: { '@typescript-eslint': typescriptEslint },
        rules: {
            '@typescript-eslint/no-explicit-any': 'error',
            'react-hooks/exhaustive-deps': 'error',
            'react-hooks/set-state-in-effect': 'off',
        },
    },
    globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
]);
