import { Router } from 'express';
import { authenticate, authorizeRole } from '../middleware/auth.middleware';
import {
  getTalentPool,
  updateTalentPoolStatus,
  removeFromTalentPool,
  applyFromTalentPool,
  refreshSuggestedJobs
} from '../controllers/talent-pool.controller';

const router = Router();

// All routes require authentication and recruiter role
router.use(authenticate);
router.use(authorizeRole('recruiter'));

// Get all talent pool entries
router.get('/', getTalentPool);

// Update talent pool entry status
router.put('/:id/status', updateTalentPoolStatus);

// Remove from talent pool
router.delete('/:id', removeFromTalentPool);

// Apply candidate from talent pool to a new job
router.post('/:id/apply', applyFromTalentPool);

// Refresh suggested jobs for a talent pool entry
router.post('/:id/refresh-suggestions', refreshSuggestedJobs);

export default router;
