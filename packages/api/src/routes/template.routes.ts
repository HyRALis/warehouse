import { Router } from 'express';
import { TemplateController } from '../controllers/template.controller';
import { validate } from '../middleware/validate';
import { createTemplateSchema, updateTemplateSchema } from '../validators/template.validators';
import { verifyAuth } from '../middleware/auth';

const router = Router();
router.use(verifyAuth);

router.get('/', TemplateController.list);
router.get('/:id', TemplateController.getById);
router.post('/', validate(createTemplateSchema), TemplateController.create);
router.put('/:id', validate(updateTemplateSchema), TemplateController.update);
router.delete('/:id', TemplateController.delete);

export default router;
