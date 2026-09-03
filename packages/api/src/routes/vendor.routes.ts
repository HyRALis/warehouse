import { Router } from 'express';
import { VendorController } from '../controllers/vendor.controller';
import { verifyAuth, verifySession } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { updateVendorSchema } from '../validators/vendor.validators';

const router = Router();

router.put('/me', verifyAuth, validate(updateVendorSchema), VendorController.updateProfile);
router.delete('/me', verifySession, VendorController.deleteAccount);

export default router;
