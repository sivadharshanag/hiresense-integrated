import { Request, Response, NextFunction } from 'express';
import { RecruiterProfile } from '../models/RecruiterProfile.model';
import { User } from '../models/User.model';
import { Job } from '../models/Job.model';
import { Application } from '../models/Application.model';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';
import crypto from 'crypto';
import { emailService } from '../services/email.service';

export const getProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    let profile = await RecruiterProfile.findOne({ userId: req.user?.id });

    // If no profile exists, return empty profile structure
    if (!profile) {
      res.status(200).json({
        status: 'success',
        data: { 
          profile: {
            companyName: '',
            department: '',
            jobTitle: '',
            companyDescription: '',
            companyWebsite: '',
            companyLocation: '',
            companyEmail: '',
            emailVerified: false,
            trustLevel: 'low'
          }
        }
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: { profile }
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { companyName, department, jobTitle, companyDescription, companyWebsite, companyLocation, companyEmail } = req.body;

    // Check if profile exists
    let profile = await RecruiterProfile.findOne({ userId: req.user?.id });

    const updateData: any = {};
    if (companyName !== undefined) updateData.companyName = companyName;
    if (department !== undefined) updateData.department = department;
    if (jobTitle !== undefined) updateData.jobTitle = jobTitle;
    if (companyDescription !== undefined) updateData.companyDescription = companyDescription;
    if (companyWebsite !== undefined) updateData.companyWebsite = companyWebsite;
    if (companyLocation !== undefined) updateData.companyLocation = companyLocation;
    
    // 🔐 If company email is being updated, reset verification
    if (companyEmail !== undefined && companyEmail !== profile?.companyEmail) {
      updateData.companyEmail = companyEmail;
      updateData.emailVerified = false;
      updateData.verificationToken = '';
      updateData.verificationTokenExpires = undefined;
      updateData.verifiedAt = undefined;
    }

    if (!profile) {
      // Create new profile
      profile = await RecruiterProfile.create({
        userId: req.user?.id,
        ...updateData
      });
    } else {
      // Update existing profile
      profile = await RecruiterProfile.findOneAndUpdate(
        { userId: req.user?.id },
        updateData,
        { new: true, runValidators: true }
      );
    }

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: { profile }
    });
  } catch (error) {
    next(error);
  }
};

// 🔐 SEND VERIFICATION EMAIL
export const sendVerificationEmail = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await RecruiterProfile.findOne({ userId: req.user?.id });
    
    if (!profile) {
      throw new AppError('Profile not found. Please create a profile first.', 404);
    }
    
    if (!profile.companyEmail) {
      throw new AppError('Please add a company email first', 400);
    }
    
    if (profile.emailVerified) {
      throw new AppError('Email already verified', 400);
    }
    
    // Generate verification token (32 random bytes)
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    // Set expiry (24 hours from now)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    // Save token to profile
    profile.verificationToken = verificationToken;
    profile.verificationTokenExpires = expiresAt;
    await profile.save();
    
    // Get user for full name
    const user = await User.findById(req.user?.id);
    
    // Send verification email
    await emailService.sendRecruiterVerification({
      recruiterName: user?.fullName || 'Recruiter',
      companyEmail: profile.companyEmail,
      companyName: profile.companyName || 'your company',
      verificationToken
    });
    
    res.status(200).json({
      status: 'success',
      message: `Verification email sent to ${profile.companyEmail}`
    });
  } catch (error) {
    next(error);
  }
};

// 🔐 VERIFY EMAIL TOKEN (PUBLIC - no auth required)
export const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;
    
    if (!token) {
      throw new AppError('Verification token is required', 400);
    }
    
    // Find profile with this token
    const profile = await RecruiterProfile.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: new Date() }
    });
    
    if (!profile) {
      throw new AppError('Invalid or expired verification token', 400);
    }
    
    // Mark as verified
    profile.emailVerified = true;
    profile.verifiedAt = new Date();
    profile.verificationToken = '';
    profile.verificationTokenExpires = undefined;
    await profile.save();
    
    res.status(200).json({
      status: 'success',
      message: 'Email verified successfully! You are now a Verified Employer.'
    });
  } catch (error) {
    next(error);
  }
};

export const getDashboard = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Get all jobs posted by this recruiter
    const jobs = await Job.find({ recruiterId: req.user?.id });
    const jobIds = jobs.map(job => job._id);

    // Get all applications for these jobs (handle empty jobIds array)
    const applications = jobIds.length > 0 
      ? await Application.find({ jobId: { $in: jobIds } })
      : [];

    // Calculate stats
    const totalJobs = jobs.length;
    const totalApplicants = applications.length;
    const selectedCount = applications.filter(app => app.status === 'selected' || app.status === 'shortlisted').length;
    const rejectedCount = applications.filter(app => app.status === 'rejected').length;
    const reviewingCount = applications.filter(app => app.status === 'reviewing' || app.status === 'under_review').length;
    const pendingCount = applications.filter(app => app.status === 'pending').length;

    // Get recent applications with AI insights (handle empty jobIds)
    const recentApplications = jobIds.length > 0
      ? await Application.find({ jobId: { $in: jobIds } })
          .populate('applicantId', 'fullName email')
          .populate('jobId', 'title')
          .sort({ appliedAt: -1 })
          .limit(10)
      : [];

    // Calculate average AI scores for trend
    const evaluatedApps = applications.filter(app => app.aiInsights?.overallScore);
    const avgScore = evaluatedApps.length > 0
      ? evaluatedApps.reduce((sum, app) => sum + (app.aiInsights?.overallScore || 0), 0) / evaluatedApps.length
      : 0;

    res.status(200).json({
      status: 'success',
      data: {
        stats: {
          totalJobs,
          totalApplicants,
          selectedCount,
          rejectedCount,
          reviewingCount,
          pendingCount,
          avgScore: Math.round(avgScore)
        },
        recentApplications: recentApplications.map(app => ({
          id: app._id,
          applicantName: (app.applicantId as any)?.fullName || 'Unknown',
          applicantEmail: (app.applicantId as any)?.email || '',
          jobTitle: (app.jobId as any)?.title || 'Unknown Position',
          status: app.status,
          score: app.aiInsights?.overallScore || 0,
          appliedAt: app.appliedAt
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};
