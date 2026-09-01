import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Button, useToast } from '@inventory-system/ui';

const ToastDemo = () => {
    const { notify } = useToast();
    return <div className="flex flex-wrap gap-3"><Button onClick={() => notify({ title: 'Profile updated', description: 'Your vendor details are now current.', variant: 'success' })}>Success toast</Button><Button variant="destructive" onClick={() => notify({ title: 'Upload failed', description: 'Retry the image upload when the connection recovers.', variant: 'danger' })}>Error toast</Button></div>;
};

const meta = { title: 'Shared UI/Feedback/Toast', component: ToastDemo } satisfies Meta<typeof ToastDemo>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = {
    play: async ({ canvasElement }) => {
        await userEvent.click(within(canvasElement).getByRole('button', { name: 'Success toast' }));
        await expect(within(canvasElement.ownerDocument.body).getByText('Profile updated')).toBeVisible();
    },
};

export const Error: Story = {
    play: async ({ canvasElement }) => {
        await userEvent.click(within(canvasElement).getByRole('button', { name: 'Error toast' }));
        await expect(within(canvasElement.ownerDocument.body).getByText('Upload failed')).toBeVisible();
    },
};
