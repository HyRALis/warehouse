import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@inventory-system/ui';

const meta = {
    title: 'Shared UI/Atoms/Button',
    component: Button,
    args: { children: 'Save changes', onClick: fn() },
    parameters: { docs: { description: { component: 'The primary action primitive with consistent focus, sizing, and semantic variants.' } } },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
    play: async ({ canvasElement, args }) => {
        await userEvent.click(within(canvasElement).getByRole('button', { name: 'Save changes' }));
        await expect(args.onClick).toHaveBeenCalledOnce();
    },
};

export const Variants: Story = {
    render: () => <div className="flex flex-wrap items-center gap-3">
        <Button><Plus className="mr-2 h-4 w-4" />Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="link">Link treatment</Button>
        <Button variant="destructive"><Trash2 className="mr-2 h-4 w-4" />Delete</Button>
    </div>,
};

export const SizesAndStates: Story = {
    render: () => <div className="flex flex-wrap items-center gap-3">
        <Button size="sm">Small</Button><Button>Default</Button><Button size="lg">Large</Button>
        <Button disabled>Disabled</Button><Button size="icon" aria-label="Add item"><Plus className="h-4 w-4" /></Button>
    </div>,
};
