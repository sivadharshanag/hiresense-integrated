/**
 * Virtual Interview Routes
 */

import express from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.middleware';
import {
  startInterview,
  transcribeAudio,
  submitAnswer,
  generateSpeech,
  getSession,
  getInterviewHistory,
  getInterviewStats,
  abandonInterview,
} from '../controllers/virtual-interview.controller';

const router = express.Router();

// Configure multer for audio file uploads (in-memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for audio files
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  },
});

// All routes require authentication
router.use(authenticate);

// Start a new interview session
router.post('/start', startInterview);

// Transcribe audio to text (STT)
router.post('/transcribe', upload.single('audio'), transcribeAudio);

// Submit answer and get evaluation
router.post('/respond', submitAnswer);

// Generate speech from text (TTS)
router.post('/speak', generateSpeech);

// Get interview session details
router.get('/session/:sessionId', getSession);

// Get user's interview history
router.get('/history', getInterviewHistory);

// Get user's interview statistics
router.get('/stats', getInterviewStats);

// Abandon interview session
router.post('/abandon/:sessionId', abandonInterview);

export default router;
