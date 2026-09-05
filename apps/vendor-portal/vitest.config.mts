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
        maxWorkers: 4,
    },
});
