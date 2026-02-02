import { Response, NextFunction } from 'express';
import { TalentPool } from '../models/TalentPool.model';
import { ApplicantProfile } from '../models/ApplicantProfile.model';
import { Job } from '../models/Job.model';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';
import talentPoolService from '../services/talent-pool.service';

// Get all talent pool entries for recruiter
export const getTalentPool = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, tag } = req.query;

    let query: any = { recruiterId: req.user?.id };
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (tag) {
      query['smartTags.tag'] = { $regex: tag, $options: 'i' };
    }

    const entries = await TalentPool.find(query)
      .populate('applicantId', 'fullName email')
      .populate('originalJobId', 'title')
      .populate('suggestedJobs.jobId', 'title status')
      .sort({ addedAt: -1 });

    // Get applicant profiles for additional info
    const applicantIds = entries.map(e => (e.applicantId as any)?._id);
    const profiles = await ApplicantProfile.find({ userId: { $in: applicantIds } });
    const profileMap = new Map(profiles.map(p => [p.userId.toString(), p]));

    // Enhance entries with profile data
    const enhancedEntries = entries.map(entry => {
      const applicant = entry.applicantId as any;
      const profile = profileMap.get(applicant?._id?.toString());
      const originalJob = entry.originalJobId as any;

      return {
        id: entry._id,
        applicantId: applicant?._id,
        name: applicant?.fullName || 'Unknown',
        email: applicant?.email || '',
        originalJob: originalJob?.title || 'Unknown Position',
        smartTags: entry.smartTags,
        suggestedJobs: entry.suggestedJobs.map(sj => {
          const sjJob = sj.jobId as any;
          return {
            jobId: sjJob?._id || sj.jobId,
            title: sjJob?.title || 'Unknown',
            status: sjJob?.status || 'unknown',
            matchScore: sj.matchScore,
            matchedSkills: sj.matchedSkills,
          };
        }),
        status: entry.status,
        notes: entry.notes,
        addedAt: entry.addedAt,
        skills: profile?.skills?.slice(0, 8) || [],
        experience: profile?.yearsOfExperience || 0,
        githubScore: profile?.githubAnalysis?.score || 0,
        location: profile?.location || '',
      };
    });

    // Calculate stats
    const stats = {
      total: entries.length,
      active: entries.filter(e => e.status === 'active').length,
      contacted: entries.filter(e => e.status === 'contacted').length,
      hired: entries.filter(e => e.status === 'hired').length,
    };

    // Get unique tags for filtering
    const allTags = entries.flatMap(e => e.smartTags.map(t => t.tag));
    const uniqueTags = [...new Set(allTags)];

    res.status(200).json({
      status: 'success',
      data: {
        entries: enhancedEntries,
        stats,
        tags: uniqueTags
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update talent pool entry status
export const updateTalentPoolStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const entry = await TalentPool.findOne({ _id: id, recruiterId: req.user?.id });
    if (!entry) {
      throw new AppError('Talent pool entry not found', 404);
    }

    const validStatuses = ['active', 'contacted', 'hired', 'archived'];
    if (!validStatuses.includes(status)) {
      throw new AppError('Invalid status', 400);
    }

    entry.status = status;
    if (notes !== undefined) {
      entry.notes = notes;
    }
    await entry.save();

    res.status(200).json({
      status: 'success',
      message: 'Talent pool entry updated',
      data: { entry }
    });
  } catch (error) {
    next(error);
  }
};

// Remove from talent pool
export const removeFromTalentPool = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const entry = await TalentPool.findOneAndDelete({ _id: id, recruiterId: req.user?.id });
    if (!entry) {
      throw new AppError('Talent pool entry not found', 404);
    }

    res.status(200).json({
      status: 'success',
      message: 'Removed from talent pool'
    });
  } catch (error) {
    next(error);
  }
};

// Apply candidate from talent pool to a new job
export const applyFromTalentPool = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { jobId } = req.body;

    const entry = await TalentPool.findOne({ _id: id, recruiterId: req.user?.id });
    if (!entry) {
      throw new AppError('Talent pool entry not found', 404);
    }

    // Verify job exists and belongs to recruiter
    const job = await Job.findOne({ _id: jobId, recruiterId: req.user?.id });
    if (!job) {
      throw new AppError('Job not found or unauthorized', 404);
    }

    // Check if candidate already applied to this job
    const { Application } = await import('../models/Application.model');
    const existingApplication = await Application.findOne({
      applicantId: entry.applicantId,
      jobId
    });

    if (existingApplication) {
      throw new AppError('Candidate has already applied to this job', 409);
    }

    // Create new application
    const application = await Application.create({
      applicantId: entry.applicantId,
      jobId,
      status: 'shortlisted', // Auto-shortlist from talent pool
      statusHistory: [{
        status: 'shortlisted',
        timestamp: new Date(),
        note: 'Added from talent pool',
        changedBy: req.user?.id
      }]
    });

    // Increment applicant count
    await Job.findByIdAndUpdate(jobId, { $inc: { applicantCount: 1 } });

    // Update talent pool entry status
    entry.status = 'contacted';
    await entry.save();

    res.status(201).json({
      status: 'success',
      message: 'Candidate added to job from talent pool',
      data: { application }
    });
  } catch (error) {
    next(error);
  }
};

// Refresh suggested jobs for a talent pool entry
export const refreshSuggestedJobs = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const entry = await TalentPool.findOne({ _id: id, recruiterId: req.user?.id });
    if (!entry) {
      throw new AppError('Talent pool entry not found', 404);
    }

    // Get candidate profile
    const profile = await ApplicantProfile.findOne({ userId: entry.applicantId });
    if (!profile) {
      throw new AppError('Candidate profile not found', 404);
    }

    // Find new matching jobs
    const suggestedJobs = await talentPoolService.findMatchingJobs(
      profile,
      req.user?.id as any,
      entry.originalJobId as any
    );

    // Update entry with new suggestions
    entry.suggestedJobs = suggestedJobs.map(sj => ({
      jobId: sj.jobId,
      matchScore: sj.matchScore,
      matchedSkills: sj.matchedSkills,
      suggestedAt: new Date()
    }));
    await entry.save();

    res.status(200).json({
      status: 'success',
      message: 'Suggested jobs refreshed',
      data: { 
        suggestedJobs: suggestedJobs.map(sj => ({
          ...sj,
          suggestedAt: new Date()
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};
