import { Router } from 'express';
import {
  checkAvailability,
  scheduleInterview,
  getInterviews,
  updateInterview,
  deleteInterview,
  // Drop-off detection endpoints
  getInterviewsAtRisk,
  getDropOffAnalytics,
  confirmInterviewAttendance,
  sendInterviewReminder,
  recordCandidateAction,
  getInterviewWithRisk
} from '../controllers/interview.controller';
import { authenticate, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

// ============= RECRUITER ROUTES (Protected) =============
// Check available time slots
router.get('/availability', authenticate, authorizeRole('recruiter'), checkAvailability);

// Get all interviews
router.get('/', authenticate, authorizeRole('recruiter'), getInterviews);

// Get interviews at risk (drop-off detection)
router.get('/at-risk', authenticate, authorizeRole('recruiter'), getInterviewsAtRisk);

// Get drop-off analytics
router.get('/analytics/dropoff', authenticate, authorizeRole('recruiter'), getDropOffAnalytics);

// Get single interview with risk assessment
router.get('/:interviewId/risk', authenticate, authorizeRole('recruiter'), getInterviewWithRisk);

// Schedule new interview
router.post('/', authenticate, authorizeRole('recruiter'), scheduleInterview);

// Send reminder to candidate
router.post('/:interviewId/reminder', authenticate, authorizeRole('recruiter'), sendInterviewReminder);

// Update interview (reschedule)
router.put('/:id', authenticate, authorizeRole('recruiter'), updateInterview);

// Cancel interview
router.delete('/:id', authenticate, authorizeRole('recruiter'), deleteInterview);

// ============= CANDIDATE ROUTES (Public with token or authenticated) =============
// Confirm interview attendance (candidate can access)
router.post('/:interviewId/confirm', authenticate, confirmInterviewAttendance);

// Record candidate action (viewing details, etc.)
router.post('/:interviewId/action', authenticate, recordCandidateAction);

export default router;
