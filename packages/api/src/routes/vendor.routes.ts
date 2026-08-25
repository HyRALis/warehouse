import { Router } from 'express';
import { VendorController } from '../controllers/vendor.controller';
import { verifyAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { updateVendorSchema } from '../validators/vendor.validators';

const router = Router();
router.use(verifyAuth);

router.put('/me', validate(updateVendorSchema), VendorController.updateProfile);
router.delete('/me', VendorController.deleteAccount);

export default router;
