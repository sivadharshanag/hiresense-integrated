import { Response, NextFunction } from 'express';
import { Job } from '../models/Job.model';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';
import { ApplicantProfile } from '../models/ApplicantProfile.model';
import { RecruiterProfile } from '../models/RecruiterProfile.model';
import { User } from '../models/User.model';
import { emailService } from '../services/email.service';
import { skillNormalizerService } from '../services/skill-normalizer.service';

// Helper function to calculate skill match percentage using NLP-based normalizer
// (e.g., "Node" matches "NodeJS", "node.js", "node js")
const calculateSkillMatch = (jobSkills: string[], applicantSkills: string[]): { percentage: number; matchedSkills: string[] } => {
  if (!jobSkills.length || !applicantSkills.length) return { percentage: 0, matchedSkills: [] };

  const result = skillNormalizerService.calculateSkillMatch(jobSkills, applicantSkills);
  return { percentage: result.score, matchedSkills: result.matchedSkills };
};

// Notify matching applicants about new job (non-blocking)
const notifyMatchingApplicants = async (job: any) => {
  try {
    if (!job.requiredSkills || job.requiredSkills.length === 0) return;

    // Find all applicant profiles with skills
    const profiles = await ApplicantProfile.find({
      skills: { $exists: true, $not: { $size: 0 } }
    }).populate('userId', 'fullName email');

    let notifiedCount = 0;

    for (const profile of profiles) {
      const user = profile.userId as any;
      if (!user || !user.email) continue;

      const { percentage, matchedSkills } = calculateSkillMatch(job.requiredSkills, profile.skills);

      // Only notify if 70%+ skill match
      if (percentage >= 70) {
        try {
          await emailService.sendJobMatchNotification({
            applicantName: user.fullName || 'Applicant',
            applicantEmail: user.email,
            jobTitle: job.title,
            companyName: 'HireSense',
            location: job.location || 'Remote',
            employmentType: job.employmentType || 'Full-time',
            experienceLevel: job.experienceLevel,
            matchedSkills,
            matchPercentage: percentage,
            jobId: job._id.toString(),
          });
          notifiedCount++;
        } catch (err) {
          console.error(`Failed to send job notification to ${user.email}:`, err);
        }
      }
    }

    console.log(`📧 Job notification: ${notifiedCount} applicants notified for "${job.title}"`);
  } catch (error) {
    console.error('Error notifying applicants:', error);
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
      // Optional company overrides
      company,
      companyDescription,
      companyWebsite,
      companyLocation
    } = req.body;

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
      // Company details
      company: companyName,
      companyDescription: companyDesc,
      companyWebsite: companyWeb,
      companyLocation: companyLoc
    });

    // Notify matching applicants in background (only for active jobs)
    if (job.status === 'active') {
      notifyMatchingApplicants(job).catch(err => console.error('Background notification error:', err));
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
