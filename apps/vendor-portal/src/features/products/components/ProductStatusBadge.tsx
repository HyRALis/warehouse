import { Badge, type BadgeProps } from '@inventory-system/ui';
import type { ProductStatus } from '@inventory-system/contracts';

const variants: Record<ProductStatus, BadgeProps['variant']> = { ACTIVE: 'success', DRAFT: 'warning', DISCONTINUED: 'danger' };
export const ProductStatusBadge = ({ status }: { status: ProductStatus }) => <Badge variant={variants[status]}>{status}</Badge>;
