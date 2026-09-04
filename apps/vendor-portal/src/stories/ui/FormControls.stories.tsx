import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input, Label, Select, Textarea } from '@inventory-system/ui';

const meta = { title: 'Shared UI/Atoms/Form Controls', component: Input } satisfies Meta<typeof Input>;
export default meta;
type Story = StoryObj<typeof meta>;

export const TextInput: Story = {
    render: () => <div className="max-w-md space-y-2"><Label htmlFor="company">Company name</Label><Input id="company" placeholder="Acme Corporation" /><p className="text-xs text-slate-400">Shown on your vendor profile.</p></div>,
};

export const SelectInput: Story = {
    render: () => <div className="max-w-md space-y-2"><Label htmlFor="status">Product status</Label><Select id="status" defaultValue="DRAFT"><option value="DRAFT">Draft</option><option value="ACTIVE">Active</option><option value="DISCONTINUED">Discontinued</option></Select></div>,
};

export const LongText: Story = {
    render: () => <div className="max-w-md space-y-2"><Label htmlFor="notes">Internal notes</Label><Textarea id="notes" rows={5} placeholder="Add context for your team…" /></div>,
};

export const InvalidAndDisabled: Story = {
    render: () => <div className="grid max-w-xl gap-5 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="invalid-email">Email address</Label><Input id="invalid-email" type="email" defaultValue="invalid" aria-invalid aria-describedby="email-error" /><p id="email-error" role="alert" className="text-xs text-rose-400">Enter a valid email address.</p></div><div className="space-y-2"><Label htmlFor="disabled-sku">Generated SKU</Label><Input id="disabled-sku" value="AUTO-1042" disabled readOnly /></div></div>,
};
