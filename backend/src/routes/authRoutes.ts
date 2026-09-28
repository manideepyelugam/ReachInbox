import { Router } from 'express';
import { googleLogin, getMe, demoLogin } from '../controllers/authController';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.post('/google', googleLogin);
router.post('/demo', demoLogin);
router.get('/me', authenticate, getMe);

export default router;
