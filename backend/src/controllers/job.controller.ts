import { Response, NextFunction } from 'express';
import { Job } from '../models/Job.model';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';
import { ApplicantProfile } from '../models/ApplicantProfile.model';
import { RecruiterProfile } from '../models/RecruiterProfile.model';
import { User } from '../models/User.model';
import { emailService } from '../services/email.service';
import { skillNormalizerService } from '../services/skill-normalizer.service';
import { createJobMatchNotification } from './notification.controller';

// Helper function to calculate skill match percentage using NLP-based normalizer
// (e.g., "Node" matches "NodeJS", "node.js", "node js")
const calculateSkillMatch = (jobSkills: string[], applicantSkills: string[]): { percentage: number; matchedSkills: string[] } => {
  if (!jobSkills.length || !applicantSkills.length) return { percentage: 0, matchedSkills: [] };

  const result = skillNormalizerService.calculateSkillMatch(jobSkills, applicantSkills);
  return { percentage: result.score, matchedSkills: result.matchedSkills };
};

// Notify matching applicants about new job (non-blocking)
const notifyMatchingApplicants = async (job: any): Promise<number> => {
  try {
    if (!job.requiredSkills || job.requiredSkills.length === 0) return 0;

    // Find all applicant profiles with skills
    const profiles = await ApplicantProfile.find({
      skills: { $exists: true, $not: { $size: 0 } }
    }).populate('userId', 'fullName email');

    let notifiedCount = 0;
    const matchThreshold = job.matchThreshold || 50; // Use job's threshold or default to 50

    for (const profile of profiles) {
      const user = profile.userId as any;
      if (!user || !user.email) continue;

      const { percentage, matchedSkills } = calculateSkillMatch(job.requiredSkills, profile.skills);

      // Notify if skill match meets or exceeds the job's threshold
      if (percentage >= matchThreshold) {
        try {
          // Create in-app notification (primary)
          await createJobMatchNotification(
            user._id.toString(),
            job._id.toString(),
            job.title,
            job.company || 'HireSense',
            percentage,
            matchedSkills
          );

          // Format application deadline if exists
          const deadlineStr = job.applicationDeadline 
            ? new Date(job.applicationDeadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
            : undefined;

          // Also try to send email (optional, non-blocking)
          emailService.sendJobMatchNotification({
            applicantName: user.fullName || 'Applicant',
            applicantEmail: user.email,
            jobTitle: job.title,
            companyName: job.company || 'HireSense',
            location: job.location || 'Remote',
            employmentType: job.employmentType || 'Full-time',
            experienceLevel: job.experienceLevel,
            matchedSkills,
            matchPercentage: percentage,
            jobId: job._id.toString(),
            salaryMin: job.salaryMin,
            salaryMax: job.salaryMax,
            applicationDeadline: deadlineStr,
            companyDescription: job.companyDescription,
          }).catch(err => {
            // Email is optional - just log the error
            console.error(`📧 Email failed for ${user.email} (notification created):`, err.message);
          });
          
          notifiedCount++;
        } catch (err) {
          console.error(`Failed to notify ${user.email}:`, err);
        }
      }
    }

    console.log(`🔔 Job notification: ${notifiedCount} applicants notified for "${job.title}" (${matchThreshold}% threshold)`);
    return notifiedCount;
  } catch (error) {
    console.error('Error notifying applicants:', error);
    return 0;
  }
};

export const createJob = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { 
      title, 
      description, 
      department,
      requiredSkills, 
      experienceLevel, 
      location, 
      employmentType,
      salaryMin,
      salaryMax,
      openings,
      status,
      matchThreshold, // NEW: Configurable match threshold
      applicationDeadline,
      // Optional company overrides
      company,
      companyDescription,
      companyWebsite,
      companyLocation
    } = req.body;

    // Validate matchThreshold if provided
    const threshold = matchThreshold !== undefined ? parseInt(matchThreshold) : 50;
    if (threshold < 0 || threshold > 100) {
      throw new AppError('Match threshold must be between 0 and 100', 400);
    }

    // Fetch recruiter profile to auto-fill company details
    const recruiterProfile = await RecruiterProfile.findOne({ userId: req.user?.id });
    
    // Use provided values or auto-fill from recruiter profile
    const companyName = company || recruiterProfile?.companyName || '';
    const companyDesc = companyDescription || recruiterProfile?.companyDescription || '';
    const companyWeb = companyWebsite || recruiterProfile?.companyWebsite || '';
    const companyLoc = companyLocation || recruiterProfile?.companyLocation || location || '';

    const job = await Job.create({
      recruiterId: req.user?.id,
      title,
      description,
      department: department || recruiterProfile?.department || 'Engineering',
      requiredSkills,
      experienceLevel,
      location,
      employmentType,
      salaryMin,
      salaryMax,
      openings: openings || 1,
      status: status || 'active',
      matchThreshold: threshold, // NEW: Save the threshold
      applicationDeadline,
      // Company details
      company: companyName,
      companyDescription: companyDesc,
      companyWebsite: companyWeb,
      companyLocation: companyLoc
    });

    // Notify matching applicants and recruiter in background (only for active jobs)
    if (job.status === 'active') {
      // Notify candidates in background
      notifyMatchingApplicants(job)
        .then(async (notifiedCount) => {
          // Send confirmation email to recruiter after candidates are notified
          try {
            const recruiter = await User.findById(req.user?.id);
            if (recruiter) {
              await emailService.sendJobPostedConfirmation({
                recruiterName: recruiter.fullName || 'Recruiter',
                recruiterEmail: recruiter.email,
                jobTitle: job.title,
                companyName: job.company || companyName || 'Your Company',
                matchThreshold: threshold,
                notifiedCount: notifiedCount,
                jobId: job._id.toString(),
                openings: job.openings
              });
              console.log(`✅ Recruiter confirmation sent to ${recruiter.email}`);
            }
          } catch (err) {
            console.error('Failed to send recruiter confirmation:', err);
          }
        })
        .catch(err => console.error('Background notification error:', err));
    }

    res.status(201).json({
      status: 'success',
      message: 'Job created successfully',
      data: { job }
    });
  } catch (error) {
    next(error);
  }
};

export const getJobs = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, recruiterId } = req.query;
    const filter: any = {};

    if (status) filter.status = status;
    if (recruiterId) filter.recruiterId = recruiterId;
    
    // If recruiter, show their jobs; if applicant, show only active jobs
    if (req.user?.role === 'recruiter') {
      filter.recruiterId = req.user.id;
    } else {
      filter.status = 'active';
    }

    const jobs = await Job.find(filter)
      .sort({ createdAt: -1 })
      .populate('recruiterId', 'fullName email');

    res.status(200).json({
      status: 'success',
      results: jobs.length,
      data: { jobs }
    });
  } catch (error) {
    next(error);
  }
};

export const getJobById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('recruiterId', 'fullName email');

    if (!job) {
      throw new AppError('Job not found', 404);
    }

    res.status(200).json({
      status: 'success',
      data: { job }
    });
  } catch (error) {
    next(error);
  }
};

export const updateJob = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const job = await Job.findOneAndUpdate(
      { _id: req.params.id, recruiterId: req.user?.id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!job) {
      throw new AppError('Job not found or unauthorized', 404);
    }

    res.status(200).json({
      status: 'success',
      message: 'Job updated successfully',
      data: { job }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteJob = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const job = await Job.findOneAndDelete({
      _id: req.params.id,
      recruiterId: req.user?.id
    });

    if (!job) {
      throw new AppError('Job not found or unauthorized', 404);
    }

    res.status(200).json({
      status: 'success',
      message: 'Job deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
