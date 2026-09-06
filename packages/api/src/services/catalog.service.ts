import { listAvailableCategories } from '../repositories/catalog.repository';

export const createCatalogService = (repository = { listAvailableCategories }) => ({
    listCategories: (vendorProfileId: string) =>
        repository.listAvailableCategories(vendorProfileId),
});

export const catalogService = createCatalogService();
