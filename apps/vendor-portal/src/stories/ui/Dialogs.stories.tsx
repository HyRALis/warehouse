import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Alert, AlertDialog, Button, Dialog, Sheet } from '@inventory-system/ui';

const DialogDemo = () => {
    const [open, setOpen] = useState(false);
    return <><Button onClick={() => setOpen(true)}>Edit profile</Button><Dialog open={open} onOpenChange={setOpen} title="Edit vendor profile" description="Update the details shown to inventory administrators." footer={<><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={() => setOpen(false)}>Save changes</Button></>}><Alert>Form controls would render here.</Alert></Dialog></>;
};

const AlertDialogDemo = ({ onConfirm }: { onConfirm: () => void }) => {
    const [open, setOpen] = useState(false);
    return <><Button variant="destructive" onClick={() => setOpen(true)}>Delete product</Button><AlertDialog open={open} onOpenChange={setOpen} title="Delete product?" description="This action permanently removes the product from the catalog." confirmLabel="Delete product" onConfirm={onConfirm} /></>;
};

const SheetDemo = () => {
    const [open, setOpen] = useState(false);
    return <><Button onClick={() => setOpen(true)}>Open navigation</Button><Sheet open={open} onOpenChange={setOpen} title="Vendor portal navigation"><nav className="space-y-2 p-6 pt-16" aria-label="Vendor portal"><a href="#overview" className="block rounded-lg bg-indigo-600 px-4 py-3 text-white">Overview</a><a href="#products" className="block rounded-lg px-4 py-3 text-slate-300">Products</a><a href="#settings" className="block rounded-lg px-4 py-3 text-slate-300">Settings</a></nav></Sheet></>;
};

const meta = {
    title: 'Shared UI/Overlays',
    component: Dialog,
    args: {
        children: null,
        onOpenChange: fn(),
        open: false,
        title: 'Dialog',
    },
} satisfies Meta<typeof Dialog>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ModalDialog: Story = {
    render: () => <DialogDemo />,
    play: async ({ canvasElement }) => {
        await userEvent.click(within(canvasElement).getByRole('button', { name: 'Edit profile' }));
        await expect(within(canvasElement.ownerDocument.body).getByRole('dialog', { name: 'Edit vendor profile' })).toBeVisible();
    },
};

const confirm = fn();
export const DestructiveConfirmation: Story = {
    render: () => <AlertDialogDemo onConfirm={confirm} />,
    play: async ({ canvasElement }) => {
        await userEvent.click(within(canvasElement).getByRole('button', { name: 'Delete product' }));
        const body = within(canvasElement.ownerDocument.body);
        await userEvent.click(await body.findByRole('button', { name: 'Delete product' }));
        await expect(confirm).toHaveBeenCalledOnce();
    },
};

export const MobileSheet: Story = {
    render: () => <SheetDemo />,
    parameters: { viewport: { defaultViewport: 'mobile1' } },
};
