import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { validate } from '../middleware/validate';
import { createProductSchema, updateProductSchema } from '../validators/product.validators';
import { verifyAuth } from '../middleware/auth';
import { uploadCsvMiddleware, uploadImageMiddleware } from '../middleware/upload';

const router = Router();
router.use(verifyAuth);

router.post('/import', uploadCsvMiddleware.single('file'), ProductController.importCSV);
router.get('/export', ProductController.exportCSV);

router.get('/', ProductController.list);
router.get('/:id', ProductController.getById);
router.post('/', validate(createProductSchema), ProductController.create);
router.put('/:id', validate(updateProductSchema), ProductController.update);
router.delete('/:id', ProductController.softDelete);
router.post('/:id/images', uploadImageMiddleware.single('image'), ProductController.uploadImage);
router.delete('/:id/images/:imageId', ProductController.deleteImage);

export default router;
