import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 2 : undefined,
    reporter: 'list',
    use: {
        baseURL: 'http://127.0.0.1:6006',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
    projects: [
        {
            name: 'desktop-chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'mobile-chromium',
            use: { ...devices['Pixel 5'] },
        },
    ],
    webServer: {
        command: 'npm run storybook -- --no-open --ci --host 127.0.0.1',
        url: 'http://127.0.0.1:6006',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
    },
});
