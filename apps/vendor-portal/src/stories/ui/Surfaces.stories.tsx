import type { Meta, StoryObj } from '@storybook/react-vite';
import { PackageX, Plus } from 'lucide-react';
import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, EmptyState, PageHeader } from '@inventory-system/ui';

const meta = { title: 'Shared UI/Surfaces', component: Card } satisfies Meta<typeof Card>;
export default meta;
type Story = StoryObj<typeof meta>;

export const CardComposition: Story = {
    render: () => <Card className="max-w-md"><CardHeader><CardTitle>Vendor profile</CardTitle><CardDescription>Details shared with inventory administrators.</CardDescription></CardHeader><CardContent><dl className="space-y-3 text-sm"><div><dt className="text-slate-400">Company</dt><dd className="text-slate-100">Acme Corporation</dd></div><div><dt className="text-slate-400">Email</dt><dd className="text-slate-100">vendor@example.com</dd></div></dl></CardContent><CardFooter><Button>Manage profile</Button></CardFooter></Card>,
};

export const Header: Story = {
    render: () => <PageHeader title="Products" description="Manage your vendor catalog" actions={<Button><Plus className="mr-2 h-4 w-4" />Add product</Button>} />,
};

export const Empty: Story = {
    render: () => <EmptyState icon={<PackageX className="h-12 w-12" />} title="No products found" description="Adjust your search or add your first product." action={<Button><Plus className="mr-2 h-4 w-4" />Add product</Button>} />,
};
