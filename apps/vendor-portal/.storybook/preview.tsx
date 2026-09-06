import type { Preview } from '@storybook/react-vite';
import { ToastProvider } from '@inventory-system/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
import '../src/app/globals.css';

const preview: Preview = {
    decorators: [
        (Story) => (
            <QueryClientProvider client={queryClient}><ToastProvider>
                <div className="min-h-screen bg-slate-950 p-6 text-slate-100 sm:p-8">
                    <Story />
                </div>
            </ToastProvider></QueryClientProvider>
        ),
    ],
    tags: ['autodocs', 'test'],
    parameters: {
        layout: 'fullscreen',
        a11y: { test: 'error' },
        controls: {
            expanded: true,
            matchers: {
                color: /(background|color)$/i,
                date: /Date$/i,
            },
        },
        backgrounds: {
            default: 'portal',
            values: [
                { name: 'portal', value: '#020617' },
                { name: 'surface', value: '#0f172a' },
                { name: 'light', value: '#f8fafc' },
            ],
        },
    },
};

export default preview;
