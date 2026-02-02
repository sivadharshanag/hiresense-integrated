import { Router } from 'express';
import passport from 'passport';
import { signup, signin, getMe, googleCallback } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Traditional auth
router.post('/signup', signup);
router.post('/signin', signin);
router.get('/me', authenticate, getMe as any);

// Google OAuth
router.get('/google', (req, res, next) => {
  // Capture the role from query param and pass it via state
  const role = req.query.role === 'recruiter' ? 'recruiter' : 'applicant';
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    session: false,
    state: role // Pass role through OAuth state
  })(req, res, next);
});

router.get('/google/callback',
  passport.authenticate('google', { 
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:8080'}/auth/signin?error=oauth_failed`
  }),
  googleCallback
);

export default router;
