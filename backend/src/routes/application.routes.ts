import { Router } from 'express';
import { authenticate, authorizeRole } from '../middleware/auth.middleware';
import { 
  applyForJob,
  getMyApplications,
  getApplicationById,
  getApplicationsByJob,
  updateApplicationStatus,
  scheduleInterview,
  generateJustification,
  generateInterviewFocus,
  generateSkillGapAnalysis,
  bulkRejectApplications,
  bulkShortlistApplications,
  bulkRejectSpecificApplications,
  getSelectedCandidates,
  generateRejectionFeedback,
  getRejectionReasons,
  getRejectionFeedback
} from '../controllers/application.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Applicant routes
router.post('/', authorizeRole('applicant'), applyForJob);
router.get('/my-applications', authorizeRole('applicant'), getMyApplications);
router.get('/:id/rejection-feedback', authorizeRole('applicant'), getRejectionFeedback);

// Common route - both roles can view application details
router.get('/:id', getApplicationById);

// Recruiter routes
router.get('/recruiter/selected-candidates', authorizeRole('recruiter'), getSelectedCandidates);
router.get('/recruiter/rejection-reasons', authorizeRole('recruiter'), getRejectionReasons);
router.get('/job/:jobId', authorizeRole('recruiter'), getApplicationsByJob);
router.put('/:id/status', authorizeRole('recruiter'), updateApplicationStatus);
router.post('/:id/schedule-interview', authorizeRole('recruiter'), scheduleInterview);
router.post('/:id/generate-justification', authorizeRole('recruiter'), generateJustification);
router.post('/:id/generate-interview-focus', authorizeRole('recruiter'), generateInterviewFocus);
router.post('/:id/generate-skill-gap-analysis', authorizeRole('recruiter'), generateSkillGapAnalysis);
router.post('/:id/generate-rejection-feedback', authorizeRole('recruiter'), generateRejectionFeedback);

// Bulk actions
router.post('/job/:jobId/bulk-reject', authorizeRole('recruiter'), bulkRejectApplications);
router.post('/job/:jobId/bulk-shortlist', authorizeRole('recruiter'), bulkShortlistApplications);
router.post('/job/:jobId/bulk-reject-specific', authorizeRole('recruiter'), bulkRejectSpecificApplications);

export default router;
