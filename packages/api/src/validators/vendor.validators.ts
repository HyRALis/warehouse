import { z } from 'zod';
import { updateVendorRequestSchema } from '@inventory-system/contracts';

export const updateVendorSchema = z.object({
    body: updateVendorRequestSchema,
});
