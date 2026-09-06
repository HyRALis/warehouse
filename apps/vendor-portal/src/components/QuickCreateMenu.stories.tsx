import type { Meta, StoryObj } from '@storybook/react-vite';
import QuickCreateMenu from './QuickCreateMenu';

const meta = {
    title: 'Vendor products/Quick create menu',
    component: QuickCreateMenu,
    parameters: {
        nextjs: { navigation: { pathname: '/dashboard/products' } },
    },
} satisfies Meta<typeof QuickCreateMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const HeaderMenu: Story = {
    args: { variant: 'header' },
};

export const MobileFloatingMenu: Story = {
    args: { variant: 'floating' },
    parameters: { viewport: { defaultViewport: 'mobile1' } },
};
