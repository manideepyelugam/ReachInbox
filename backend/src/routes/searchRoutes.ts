import { Router } from 'express';
import { searchEmails } from '../controllers/searchController';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.get('/', authenticate, searchEmails);

export default router;
