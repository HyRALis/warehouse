import type { Config } from 'tailwindcss';

const sharedConfig: Omit<Config, 'content'> = {
    theme: {
        extend: {
            colors: {
                // Shared colors can go here
            },
        },
    },
    plugins: [],
};

export default sharedConfig;
