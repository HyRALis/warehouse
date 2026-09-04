import type { Meta, StoryObj } from '@storybook/react-vite';
import { Alert } from '@inventory-system/ui';

const meta = { title: 'Shared UI/Feedback/Alert', component: Alert, args: { children: 'Your changes have been saved.', variant: 'success' } } satisfies Meta<typeof Alert>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
export const Variants: Story = {
    render: () => <div className="max-w-2xl space-y-3"><Alert>Inventory data refreshes every 30 seconds.</Alert><Alert variant="success">Profile updated successfully.</Alert><Alert variant="warning">The product was created, but its image still needs to be uploaded.</Alert><Alert variant="danger">The category could not be deleted because products still use it.</Alert></div>,
};
