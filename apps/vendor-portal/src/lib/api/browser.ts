import { createApiClient } from './client';
import { createInventoryApi } from './inventory-api';

export const browserApi = createInventoryApi(createApiClient('/api/v1'));
