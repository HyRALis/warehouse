import { Router } from 'express';
import { VendorController } from '../controllers/vendor.controller';
import { verifyAuth } from '../middleware/auth';

const router = Router();
router.use(verifyAuth);

router.put('/profile', VendorController.updateProfile);
router.delete('/', VendorController.deleteAccount);

export default router;
