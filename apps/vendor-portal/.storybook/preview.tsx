import type { Preview } from '@storybook/nextjs-vite';
import '../src/app/globals.css';

const preview: Preview = {
    parameters: {
        layout: 'fullscreen',
        backgrounds: {
            default: 'portal',
            values: [{ name: 'portal', value: '#020617' }],
        },
    },
    decorators: [
        (Story) => (
            <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
                <Story />
            </main>
        ),
    ],
};

export default preview;
