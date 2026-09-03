import { configDefaults, defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
    test: {
        environment: 'jsdom',
        setupFiles: ['./src/test/setup.ts'],
        exclude: [...configDefaults.exclude, 'e2e/**'],
        css: false,
        // Turbo runs the API Jest suite beside Vitest. Bound the browser-test worker pool so the
        // two runners cannot exhaust process/memory limits on Windows or small CI executors.
        maxWorkers: 4,
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
