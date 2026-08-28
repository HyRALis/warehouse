import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { validate } from '../middleware/validate';
import { createProductSchema, updateProductSchema } from '../validators/product.validators';
import { verifyAuth } from '../middleware/auth';
import { uploadCsvMiddleware, uploadImageMiddleware } from '../middleware/upload';
import { ProductVersionController } from '../controllers/product-version.controller';
import {
    compareProductVersionsSchema,
    createProductVersionSchema,
    productVersionParamsSchema,
    updateProductVersionSchema,
} from '../validators/product-version.validators';

const router = Router();
router.use(verifyAuth);

router.post('/import', uploadCsvMiddleware.single('file'), ProductController.importCSV);
router.get('/export', ProductController.exportCSV);

router.get('/:productId/versions', ProductVersionController.list);
router.get(
    '/:productId/versions/compare',
    validate(compareProductVersionsSchema),
    ProductVersionController.compare
);
router.post(
    '/:productId/versions',
    validate(createProductVersionSchema),
    ProductVersionController.create
);
router.get(
    '/:productId/versions/:versionId',
    validate(productVersionParamsSchema),
    ProductVersionController.getById
);
router.put(
    '/:productId/versions/:versionId',
    validate(updateProductVersionSchema),
    ProductVersionController.update
);
router.post(
    '/:productId/versions/:versionId/primary',
    validate(productVersionParamsSchema),
    ProductVersionController.setPrimary
);
router.delete(
    '/:productId/versions/:versionId',
    validate(productVersionParamsSchema),
    ProductVersionController.softDelete
);
router.post(
    '/:productId/versions/:versionId/images',
    validate(productVersionParamsSchema),
    uploadImageMiddleware.single('image'),
    ProductVersionController.uploadImage
);

router.get('/', ProductController.list);
router.get('/:id', ProductController.getById);
router.post('/', validate(createProductSchema), ProductController.create);
router.put('/:id', validate(updateProductSchema), ProductController.update);
router.delete('/:id', ProductController.softDelete);
router.post('/:id/images', uploadImageMiddleware.single('image'), ProductController.uploadImage);
router.delete('/:id/images/:imageId', ProductController.deleteImage);

export default router;
