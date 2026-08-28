import { Router } from 'express';
import { SearchController } from '../controllers/search.controller';
import { verifyAuth } from '../middleware/auth';
import { searchLimiter } from '../middleware/rate-limit';
import { validate } from '../middleware/validate';
import { universalSearchSchema } from '../validators/search.validators';

const router = Router();

router.use(verifyAuth);
router.use(searchLimiter);
router.get('/', validate(universalSearchSchema), SearchController.universal);

export default router;
