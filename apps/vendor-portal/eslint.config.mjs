import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import typescriptEslint from '@typescript-eslint/eslint-plugin';

/**
 * Enforces the mechanically checkable parts of docs/standards/frontend.md.
 * Layer and package boundaries that ESLint cannot express across workspaces are checked by
 * `node tools/check-standards.mjs`.
 */
export default defineConfig([
    ...nextVitals,
    {
        plugins: { '@typescript-eslint': typescriptEslint },
        rules: {
            // Type safety — standards/README.md §4
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/no-non-null-assertion': 'error',
            eqeqeq: ['error', 'always', { null: 'ignore' }],

            // Hooks — standards/frontend.md §7
            'react-hooks/exhaustive-deps': 'error',
            'react-hooks/set-state-in-effect': 'off',

            // Readability — standards/README.md §6
            'no-nested-ternary': 'error',
            'max-depth': ['error', 3],
            'no-console': 'error',

            // Package boundaries — standards/README.md §3
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: ['@inventory-system/*/*'],
                            message:
                                'Import a workspace package from its root. Deep imports bypass its public surface (standards/README.md §3).',
                        },
                        {
                            group: ['**/apps/*/**'],
                            message:
                                'Portals must not import each other. Share through packages/* or duplicate deliberately (standards/frontend.md §1.2).',
                        },
                        {
                            group: ['../../../*'],
                            message:
                                'Use the "@/" alias instead of climbing three or more directories.',
                        },
                    ],
                },
            ],
        },
    },
    {
        // Features and shared UI use named exports so refactors, stories, and tests stay honest.
        files: ['src/features/**/*.{ts,tsx}'],
        ignores: ['**/*.test.{ts,tsx}', '**/*.stories.{ts,tsx}'],
        rules: {
            'no-restricted-syntax': [
                'error',
                {
                    selector: 'ExportDefaultDeclaration',
                    message:
                        'Use a named export. Default exports are only for Next.js page/layout/route files (standards/README.md §5).',
                },
            ],
        },
    },
    {
        // Route files are composition boundaries; Next.js requires the default export here.
        files: ['src/app/**/*.{ts,tsx}'],
        rules: { 'no-restricted-syntax': 'off' },
    },
    globalIgnores(['.next/**', 'out/**', 'build/**', 'storybook-static/**', 'next-env.d.ts']),
]);
