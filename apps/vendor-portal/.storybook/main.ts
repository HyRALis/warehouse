import { fileURLToPath } from 'node:url';
import type { StorybookConfig } from '@storybook/react-vite';

const configDirectory = fileURLToPath(new URL('.', import.meta.url));

const config: StorybookConfig = {
    framework: {
        name: '@storybook/react-vite',
        options: {},
    },
    stories: ['../src/**/*.stories.@(ts|tsx)'],
    addons: ['@storybook/addon-docs', '@storybook/addon-a11y', '@storybook/addon-vitest'],
    docs: { defaultName: 'Documentation' },
    features: { developmentModeForBuild: true },
    core: { disableTelemetry: true },
    async viteFinal(baseConfig) {
        const { mergeConfig } = await import('vite');

        return mergeConfig(baseConfig, {
            oxc: {
                jsx: {
                    runtime: 'automatic',
                },
            },
            resolve: {
                alias: {
                    'next/image': `${configDirectory}/mocks/next-image.tsx`,
                    'next/link': `${configDirectory}/mocks/next-link.tsx`,
                    'next/navigation': `${configDirectory}/mocks/next-navigation.ts`,
                    '@': `${configDirectory}/../src`,
                },
            },
        });
    },
};

export default config;
