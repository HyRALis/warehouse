import { Router } from 'express';
import { PlatformController } from '../controllers/platform.controller';
import { verifyAuth, verifySession } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
    updateMemberPortalAccessSchema,
    updateVendorProfileSchema,
} from '../validators/platform.validators';

const router = Router();

router.get('/context', verifySession, PlatformController.context);
router.get('/vendor-profile', verifyAuth, PlatformController.vendorProfile);
router.put(
    '/vendor-profile',
    verifyAuth,
    validate(updateVendorProfileSchema),
    PlatformController.updateVendorProfile
);
router.get('/vendor/members', verifySession, PlatformController.listMembers);
router.put(
    '/vendor/members/:memberId/access',
    verifySession,
    validate(updateMemberPortalAccessSchema),
    PlatformController.updateMemberAccess
);

export default router;
