import { Router } from 'express';
import multer from 'multer';
import { authenticate, authorizeRole } from '../middleware/auth.middleware';
import { 
  getProfile, 
  updateProfile,
  uploadResume,
  parseResume,
  analyzeLeetCode,
  uploadAvatar
} from '../controllers/applicant.controller';

// Configure multer for memory storage (we'll process files in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
});

const router = Router();

// All routes require authentication and applicant role
router.use(authenticate);
router.use(authorizeRole('applicant'));

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.post('/upload-resume', uploadResume);
router.post('/parse-resume', upload.single('resume'), parseResume);
router.post('/analyze-leetcode', analyzeLeetCode);
router.post('/upload-avatar', upload.single('avatar'), uploadAvatar);

export default router;
