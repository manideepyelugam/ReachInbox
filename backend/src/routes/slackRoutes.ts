import { Router } from 'express';
import {
  getAuthUrl,
  handleOAuthCallback,
  getStatus,
  disconnect,
  sendTestAlert,
} from '../controllers/slackController';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.get('/auth-url', authenticate, getAuthUrl);
router.get('/callback', handleOAuthCallback);
router.get('/status', authenticate, getStatus);
router.post('/disconnect', authenticate, disconnect);
router.post('/test-alert', authenticate, sendTestAlert);

export default router;
