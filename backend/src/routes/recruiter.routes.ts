import { Router } from 'express';
import { authenticate, authorizeRole } from '../middleware/auth.middleware';
import { 
  getProfile, 
  updateProfile,
  getDashboard,
  sendVerificationEmail,
  verifyEmail
} from '../controllers/recruiter.controller';

const router = Router();

// 🔐 PUBLIC ROUTE - Email verification (no auth required)
// This must be BEFORE the auth middleware
router.get('/verify/:token', verifyEmail);

// All other routes require authentication and recruiter role
router.use(authenticate);
router.use(authorizeRole('recruiter'));

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.get('/dashboard', getDashboard);

// 🔐 Send verification (requires auth - user must be logged in)
router.post('/send-verification', sendVerificationEmail);

export default router;
