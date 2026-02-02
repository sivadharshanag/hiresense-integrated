import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  analyzeGitHub,
  evaluateApplication,
  evaluateJobApplications,
} from '../controllers/ai.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GitHub analysis
router.post('/github', analyzeGitHub);

// Evaluate single application
router.post('/evaluate/:applicationId', evaluateApplication);

// Batch evaluate all applications for a job
router.post('/evaluate-job/:jobId', evaluateJobApplications);

export default router;
