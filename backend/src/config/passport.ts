/**
 * Passport.js Configuration for OAuth Authentication
 */

import passport from 'passport';
import { Strategy as GoogleStrategy, Profile as GoogleProfile, VerifyCallback } from 'passport-google-oauth20';
import { User } from '../models/User.model';
import { ApplicantProfile } from '../models/ApplicantProfile.model';
import { RecruiterProfile } from '../models/RecruiterProfile.model';

// Google OAuth Strategy
const configureGoogleStrategy = () => {
  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const callbackURL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';

  if (!clientID || !clientSecret) {
    console.warn('⚠️ Google OAuth not configured - missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL,
        scope: ['profile', 'email'],
        passReqToCallback: true, // Pass request to callback to access state
      },
      async (req: any, accessToken: string, refreshToken: string, profile: GoogleProfile, done: VerifyCallback) => {
        try {
          const email = profile.emails?.[0]?.value;
          
          if (!email) {
            return done(new Error('No email provided by Google'), undefined);
          }

          // Get role from state (passed from frontend)
          const selectedRole = req.query?.state === 'recruiter' ? 'recruiter' : 'applicant';

          // Check if user already exists
          let user = await User.findOne({ email });

          if (user) {
            // Update Google ID if not set
            if (!user.googleId) {
              user.googleId = profile.id;
              if (profile.photos?.[0]?.value) {
                user.avatarUrl = profile.photos[0].value;
              }
              await user.save();
            }
            // Return user with id for our auth system
            return done(null, { id: user._id.toString(), role: user.role, email: user.email, fullName: user.fullName } as Express.User);
          }

          // Create new user with selected role
          user = await User.create({
            email,
            fullName: profile.displayName || email.split('@')[0],
            googleId: profile.id,
            avatarUrl: profile.photos?.[0]?.value,
            role: selectedRole, // Use the role selected by user
            password: `oauth_${Date.now()}_${Math.random().toString(36)}`, // Random password for OAuth users
          });

          // Create profile based on role
          if (selectedRole === 'recruiter') {
            await RecruiterProfile.create({ userId: user._id });
          } else {
            await ApplicantProfile.create({ userId: user._id });
          }

          // Return user with id for our auth system
          return done(null, { id: user._id.toString(), role: user.role, email: user.email, fullName: user.fullName } as Express.User);
        } catch (error) {
          return done(error as Error, undefined);
        }
      }
    )
  );

  console.log('✅ Google OAuth strategy configured');
};

// Serialize user for session (not used with JWT but required by passport)
passport.serializeUser((user: any, done: (err: any, id?: any) => void) => {
  done(null, user._id || user.id);
});

passport.deserializeUser(async (id: string, done: (err: any, user?: any) => void) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Initialize all strategies
export const initializePassport = () => {
  configureGoogleStrategy();
};

export default passport;
