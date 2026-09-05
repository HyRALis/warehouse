import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    resolve: { tsconfigPaths: true },
    test: {
        environment: 'jsdom',
        setupFiles: ['./src/test/setup.ts'],
        globals: true,
        restoreMocks: true,
        css: false,
        // Turbo runs the API Jest suite beside Vitest. Bound the worker pool so the two runners
        // cannot exhaust process/memory limits on Windows or small CI executors.
        maxWorkers: 2,
        // Real keyboard workflows share CI CPU with Jest and PostgreSQL migration tests.
        // Keep a finite deadline without treating a five-second scheduling delay as a UI bug.
        testTimeout: 15_000,
    },
});
