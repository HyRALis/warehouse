import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';

export default defineConfig([
    ...nextVitals,
    {
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            'react-hooks/exhaustive-deps': 'warn',
            'react-hooks/set-state-in-effect': 'off',
        },
    },
    globalIgnores(['.next/**', 'out/**', 'build/**', 'storybook-static/**', 'next-env.d.ts']),
]);
