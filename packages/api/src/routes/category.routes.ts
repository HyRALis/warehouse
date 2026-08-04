import { Router } from 'express';
import { CategoryController } from '../controllers/category.controller';
import { validate } from '../middleware/validate';
import { createCategorySchema, updateCategorySchema } from '../validators/category.validators';
import { verifyAuth } from '../middleware/auth';

const router = Router();
router.use(verifyAuth);

router.get('/', CategoryController.list);
router.post('/', validate(createCategorySchema), CategoryController.create);
router.put('/:id', validate(updateCategorySchema), CategoryController.update);
router.delete('/:id', CategoryController.delete);

export default router;
