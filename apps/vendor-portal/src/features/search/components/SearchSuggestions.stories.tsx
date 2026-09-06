import type { Meta, StoryObj } from '@storybook/react-vite';
import type { UniversalSearchResult } from '@inventory-system/contracts';
import { SearchSuggestions } from './SearchSuggestions';

const result: UniversalSearchResult = { id: 'p1', type: 'product', title: 'Creator Hoodie', subtitle: 'HOODIE-001 · Clothing', href: '/dashboard/products/p1', score: 100, matchedField: 'name', context: {} };
const meta = { title: 'Vendor/Search/Suggestions', component: SearchSuggestions,
    args: { groups: [{ type: 'product', label: 'Products', results: [result] }], results: [result], query: 'hoodie', activeIndex: 0, onSelect: () => undefined },
} satisfies Meta<typeof SearchSuggestions>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Empty: Story = { args: { groups: [], results: [] } };
