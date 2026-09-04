import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Pagination } from '@inventory-system/ui';

const PaginationDemo = ({ initialPage = 2, totalPages = 8, totalItems = 91 }: { initialPage?: number; totalPages?: number; totalItems?: number }) => {
    const [page, setPage] = useState(initialPage);
    return <Pagination page={page} totalPages={totalPages} totalItems={totalItems} onPageChange={setPage} />;
};

const meta = { title: 'Shared UI/Navigation/Pagination', component: Pagination, args: { page: 2, totalPages: 8, totalItems: 91, onPageChange: () => undefined } } satisfies Meta<typeof Pagination>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Interactive: Story = {
    render: () => <PaginationDemo />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('Page 2 of 8')).toBeInTheDocument();
        await userEvent.click(canvas.getByRole('button', { name: 'Next page' }));
        await expect(canvas.getByText('Page 3 of 8')).toBeInTheDocument();
    },
};

export const FirstPage: Story = { render: () => <PaginationDemo initialPage={1} /> };
export const LastPage: Story = { render: () => <PaginationDemo initialPage={8} /> };
