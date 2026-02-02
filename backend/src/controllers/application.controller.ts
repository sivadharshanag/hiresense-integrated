import { Response, NextFunction } from 'express';
import { Application } from '../models/Application.model';
import { Job } from '../models/Job.model';
import { Interview } from '../models/Interview.model';
import { ApplicantProfile } from '../models/ApplicantProfile.model';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';
import { emailService } from '../services/email.service';
import { justificationService } from '../services/justification.service';
import interviewService from '../services/interview.service';
import skillGapService from '../services/skillGap.service';
import { User } from '../models/User.model';
import talentPoolService from '../services/talent-pool.service';
import rejectionFeedbackService from '../services/rejection-feedback.service';
import applicantFeedbackService from '../services/applicant-feedback.service';

export const applyForJob = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { jobId, coverLetter } = req.body;

    // Check if job exists
    const job = await Job.findById(jobId);
    if (!job) {
      throw new AppError('Job not found', 404);
    }

    // Check if already applied
    const existingApplication = await Application.findOne({
      applicantId: req.user?.id,
      jobId
    });

    if (existingApplication) {
      throw new AppError('You have already applied for this job', 409);
    }

    // Get applicant profile to include GitHub score in initial aiInsights
    const applicantProfile = await ApplicantProfile.findOne({ userId: req.user?.id });
    
    // Create initial AI insights with GitHub score if available
    const initialAiInsights = applicantProfile?.githubAnalysis?.score ? {
      skillMatch: 0,
      experienceScore: 0,
      githubScore: applicantProfile.githubAnalysis.score,
      educationScore: 0,
      overallScore: 0,
      strengths: [],
      gaps: [],
      recommendation: 'review' as const,
      confidence: 0
    } : undefined;

    // Create application
    const application = await Application.create({
      applicantId: req.user?.id,
      jobId,
      coverLetter: coverLetter || '',
      status: 'pending',
      statusHistory: [{
        status: 'pending',
        timestamp: new Date(),
        note: 'Application submitted'
      }],
      aiInsights: initialAiInsights
    });

    // Increment applicant count
    await Job.findByIdAndUpdate(jobId, { $inc: { applicantCount: 1 } });

    // Send application received email (non-blocking)
    const applicant = await User.findById(req.user?.id);
    if (applicant) {
      emailService.sendApplicationReceived({
        applicantName: applicant.fullName,
        applicantEmail: applicant.email,
        jobTitle: job.title,
        companyName: 'HireSense',
      }).catch(err => console.error('Email failed:', err));
    }

    res.status(201).json({
      status: 'success',
      message: '📧 Application submitted successfully. Confirmation email sent.',
      data: { application }
    });
  } catch (error) {
    next(error);
  }
};

export const getMyApplications = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const applications = await Application.find({ applicantId: req.user?.id })
      .populate('jobId', 'title description location type company department salaryRange employmentType experienceLevel requiredSkills')
      .sort({ appliedAt: -1 });

    res.status(200).json({
      status: 'success',
      results: applications.length,
      data: { applications }
    });
  } catch (error) {
    next(error);
  }
};

// Get rejection feedback for an applicant's application
export const getRejectionFeedback = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const application = await Application.findOne({
      _id: id,
      applicantId: req.user?.id,
      status: 'rejected'
    }).populate('jobId', 'title requiredSkills experienceLevel');

    if (!application) {
      throw new AppError('Application not found or not rejected', 404);
    }

    // Check if feedback exists and has meaningful content
    const hasValidFeedback = application.rejectionFeedback && 
      application.rejectionFeedback.reasons && 
      application.rejectionFeedback.reasons.length > 0 &&
      application.rejectionFeedback.improvementAreas &&
      application.rejectionFeedback.improvementAreas.length > 0;

    if (!hasValidFeedback) {
      // Generate feedback if not already generated or is empty
      try {
        const job = await Job.findById((application.jobId as any)?._id || application.jobId);
        const applicantProfile = await ApplicantProfile.findOne({ userId: application.applicantId });
        
        const jobData = job || (application.jobId as any);
        
        if (jobData) {
          console.log('🔄 Generating rejection feedback for application:', id);
          
          const feedbackInput = {
            jobTitle: jobData.title || 'Unknown Position',
            requiredSkills: jobData.requiredSkills || [],
            candidateSkills: applicantProfile?.skills || [],
            experienceRequired: jobData.experienceLevel || '',
            candidateExperience: applicantProfile?.experience?.[0]?.role || '',
            aiInsights: application.aiInsights ? {
              gaps: application.aiInsights.gaps || [],
              strengths: application.aiInsights.strengths || [],
              recommendation: application.aiInsights.recommendation,
              skillMatch: application.aiInsights.skillMatch || 0,
              experienceScore: application.aiInsights.experienceScore || 0
            } : undefined
          };
          
          const feedback = await applicantFeedbackService.generateApplicantFeedback(feedbackInput);
          application.rejectionFeedback = feedback;
          await application.save();
          console.log('✅ Rejection feedback generated and saved');
        }
      } catch (feedbackError) {
        console.error('Failed to generate rejection feedback:', feedbackError);
      }
    }

    // Prepare final feedback with fallbacks for any missing fields
    const finalFeedback = {
      status: application.rejectionFeedback?.status || 'Not Selected',
      statusMessage: application.rejectionFeedback?.statusMessage || 
        `This decision was based on role-specific requirements for the ${(application.jobId as any)?.title || 'position'} and high competition among candidates.`,
      reasons: (application.rejectionFeedback?.reasons && application.rejectionFeedback.reasons.length > 0) 
        ? application.rejectionFeedback.reasons 
        : ['Experience with certain required technologies was limited', 'High competition from other candidates in this hiring cycle'],
      improvementAreas: (application.rejectionFeedback?.improvementAreas && application.rejectionFeedback.improvementAreas.length > 0)
        ? application.rejectionFeedback.improvementAreas
        : ['Continue developing your technical skills', 'Build portfolio projects to demonstrate your abilities', 'Consider contributing to open-source projects'],
      learningFocus: (application.rejectionFeedback?.learningFocus && application.rejectionFeedback.learningFocus.length > 0)
        ? application.rejectionFeedback.learningFocus
        : ['Technical interview preparation', 'Industry best practices', 'System design fundamentals'],
      encouragement: application.rejectionFeedback?.encouragement || 
        'This feedback is provided to help you prepare for future opportunities. Keep learning and growing!'
    };

    res.status(200).json({
      status: 'success',
      data: {
        applicationId: application._id,
        jobTitle: (application.jobId as any)?.title,
        rejectionFeedback: finalFeedback
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getApplicationById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const application = await Application.findById(id)
      .populate('jobId')
      .populate('applicantId', 'fullName email');

    if (!application) {
      throw new AppError('Application not found', 404);
    }

    const appObj = application.toObject();
    
    // Enhance with GitHub score from ApplicantProfile if missing
    if (!appObj.aiInsights?.githubScore || appObj.aiInsights.githubScore === 0) {
      const profile = await ApplicantProfile.findOne({ userId: appObj.applicantId });
      if (profile?.githubAnalysis?.score) {
        if (!appObj.aiInsights) {
          appObj.aiInsights = {
            skillMatch: 0,
            experienceScore: 0,
            githubScore: profile.githubAnalysis.score,
            educationScore: 0,
            overallScore: 0,
            strengths: [],
            gaps: [],
            recommendation: 'review' as const,
            confidence: 0
          };
        } else {
          appObj.aiInsights.githubScore = profile.githubAnalysis.score;
        }
      }
    }

    res.status(200).json({
      status: 'success',
      data: { application: appObj }
    });
  } catch (error) {
    next(error);
  }
};

export const getApplicationsByJob = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { jobId } = req.params;

    // Verify the job belongs to this recruiter
    const job = await Job.findOne({ _id: jobId, recruiterId: req.user?.id });
    if (!job) {
      throw new AppError('Job not found or unauthorized', 404);
    }

    const applications = await Application.find({ jobId })
      .populate('applicantId', 'fullName email')
      .sort({ 'aiInsights.overallScore': -1 }); // Sort by AI score

    // Enhance applications with GitHub score from ApplicantProfile if not already in aiInsights
    const enhancedApplications = await Promise.all(
      applications.map(async (app) => {
        const appObj = app.toObject();
        
        // If GitHub score is missing or 0, fetch from ApplicantProfile
        if (!appObj.aiInsights?.githubScore || appObj.aiInsights.githubScore === 0) {
          const profile = await ApplicantProfile.findOne({ userId: appObj.applicantId });
          if (profile?.githubAnalysis?.score) {
            // Update aiInsights with GitHub score
            if (!appObj.aiInsights) {
              appObj.aiInsights = {
                skillMatch: 0,
                experienceScore: 0,
                githubScore: profile.githubAnalysis.score,
                educationScore: 0,
                overallScore: 0,
                strengths: [],
                gaps: [],
                recommendation: 'review' as const,
                confidence: 0
              };
            } else {
              appObj.aiInsights.githubScore = profile.githubAnalysis.score;
            }
          }
        }
        
        return appObj;
      })
    );

    res.status(200).json({
      status: 'success',
      results: enhancedApplications.length,
      data: { applications: enhancedApplications }
    });
  } catch (error) {
    next(error);
  }
};

export const updateApplicationStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, note, rejectionReason, sendFeedback } = req.body;

    const application = await Application.findById(id);
    if (!application) {
      throw new AppError('Application not found', 404);
    }

    const previousStatus = application.status;

    // Update hiredCount on the job when status changes to/from 'hired'
    if (status === 'hired' && previousStatus !== 'hired') {
      // Incrementing hiredCount when candidate is hired
      await Job.findByIdAndUpdate(application.jobId, { $inc: { hiredCount: 1 } });
    } else if (previousStatus === 'hired' && status !== 'hired') {
      // Decrementing hiredCount if changing away from hired
      await Job.findByIdAndUpdate(application.jobId, { $inc: { hiredCount: -1 } });
    }

    // Add to status history
    application.statusHistory.push({
      status,
      timestamp: new Date(),
      note: note || rejectionReason || undefined,
      changedBy: req.user?.id as any
    });

    application.status = status;
    application.reviewedAt = new Date();

    // Auto-generate applicant-facing rejection feedback
    if (status === 'rejected' && previousStatus !== 'rejected') {
      try {
        // Get job and applicant profile for feedback generation
        const job = await Job.findById(application.jobId);
        const applicantProfile = await ApplicantProfile.findOne({ userId: application.applicantId });
        
        if (job) {
          const feedbackInput = {
            jobTitle: job.title,
            requiredSkills: job.requiredSkills || [],
            candidateSkills: applicantProfile?.skills || [],
            experienceRequired: job.experienceLevel,
            candidateExperience: applicantProfile?.experience?.[0]?.role || '',
            aiInsights: application.aiInsights ? {
              gaps: application.aiInsights.gaps,
              strengths: application.aiInsights.strengths,
              recommendation: application.aiInsights.recommendation,
              skillMatch: application.aiInsights.skillMatch,
              experienceScore: application.aiInsights.experienceScore
            } : undefined
          };
          
          const feedback = await applicantFeedbackService.generateApplicantFeedback(feedbackInput);
          application.rejectionFeedback = feedback;
          console.log('✅ Auto-generated rejection feedback for applicant');
        }
      } catch (feedbackError) {
        console.error('Failed to generate rejection feedback:', feedbackError);
        // Continue without feedback - not critical
      }
    }

    await application.save();

    // Auto Talent Pooling: If rejected, try to add to talent pool
    let talentPoolResult = null;
    if (status === 'rejected' && previousStatus !== 'rejected') {
      talentPoolResult = await talentPoolService.addToTalentPoolOnRejection(
        application._id as any,
        req.user?.id as any
      );
    }

    // Send status update email (non-blocking)
    const populatedApp = await Application.findById(id)
      .populate('applicantId', 'fullName email')
      .populate('jobId', 'title');
    
    if (populatedApp && populatedApp.applicantId && populatedApp.jobId) {
      const applicant = populatedApp.applicantId as any;
      const job = populatedApp.jobId as any;
      
      // Build email note with rejection feedback if applicable
      let emailNote = note || undefined;
      if (status === 'rejected' && rejectionReason && sendFeedback) {
        emailNote = rejectionReason;
      }
      
      emailService.sendStatusUpdated({
        applicantName: applicant.fullName,
        applicantEmail: applicant.email,
        jobTitle: job.title,
        companyName: 'HireSense',
        newStatus: status,
        note: emailNote,
      }).catch(err => console.error('Email failed:', err));
    }

    // Build response message
    let message = '📨 Application status updated. Candidate notified successfully.';
    if (talentPoolResult?.addedToPool) {
      message += ` 🌟 Candidate added to talent pool with ${talentPoolResult.suggestedJobs.length} suggested job(s).`;
    }

    res.status(200).json({
      status: 'success',
      message,
      data: { 
        application,
        talentPoolResult
      }
    });
  } catch (error) {
    next(error);
  }
};

export const scheduleInterview = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { scheduledTime, duration, type, meetingLink } = req.body;

    // Verify application exists
    const application = await Application.findById(id);
    if (!application) {
      throw new AppError('Application not found', 404);
    }

    // Create interview
    const interview = await Interview.create({
      applicationId: id,
      scheduledTime,
      duration: duration || 60,
      type: type || 'Technical',
      meetingLink: meetingLink || 'To be shared'
    });

    // Update application status
    await Application.findByIdAndUpdate(id, { status: 'selected' });

    res.status(201).json({
      status: 'success',
      message: 'Interview scheduled successfully',
      data: { interview }
    });
  } catch (error) {
    next(error);
  }
};

// Generate decision justification
export const generateJustification = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'select', 'reject', 'review', 'shortlist', 'interview'

    const application = await Application.findById(id);
    if (!application) {
      throw new AppError('Application not found', 404);
    }

    const justification = justificationService.generateJustification({
      action,
      application
    });

    res.status(200).json({
      status: 'success',
      data: { 
        justification,
        action
      }
    });
  } catch (error) {
    next(error);
  }
};

// Generate interview focus questions
export const generateInterviewFocus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const application = await Application.findById(id).populate('jobId');
    if (!application) {
      throw new AppError('Application not found', 404);
    }

    if (!application.aiInsights) {
      throw new AppError('Application must be evaluated first before generating interview focus', 400);
    }

    const job = application.jobId as any;
    const interviewFocus = interviewService.generateInterviewFocus(
      application.aiInsights,
      job.title,
      job.requiredSkills || []
    );

    res.status(200).json({
      status: 'success',
      data: interviewFocus
    });
  } catch (error) {
    next(error);
  }
};

// Generate skill gap analysis
export const generateSkillGapAnalysis = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const application = await Application.findById(id).populate(['jobId', 'applicantId']);
    if (!application) {
      throw new AppError('Application not found', 404);
    }

    const job = application.jobId as any;
    const applicantId = (application.applicantId as any)._id;

    // Get applicant profile for skills
    const applicantProfile = await ApplicantProfile.findOne({ userId: applicantId });
    const candidateSkills = applicantProfile?.skills || [];

    const skillGapAnalysis = skillGapService.analyzeSkillGaps(
      job.requiredSkills || [],
      candidateSkills,
      application.aiInsights
    );

    res.status(200).json({
      status: 'success',
      data: skillGapAnalysis
    });
  } catch (error) {
    next(error);
  }
};

// Bulk reject remaining applicants for a job
export const bulkRejectApplications = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { jobId } = req.params;
    const { confirmationText } = req.body;

    // Verify confirmation text
    if (confirmationText !== 'CONFIRM REJECTION') {
      throw new AppError('Invalid confirmation. Please type "CONFIRM REJECTION" to proceed.', 400);
    }

    // Verify job exists and belongs to recruiter
    const job = await Job.findOne({ _id: jobId, recruiterId: req.user?.id });
    if (!job) {
      throw new AppError('Job not found or unauthorized', 404);
    }

    // Find all applications that are not hired or already rejected
    const applicationsToReject = await Application.find({
      jobId,
      status: { $nin: ['hired', 'rejected'] }
    }).populate('applicantId', 'fullName email');

    if (applicationsToReject.length === 0) {
      return res.status(200).json({
        status: 'success',
        message: 'No applications to reject',
        data: { rejectedCount: 0 }
      });
    }

    // Bulk update all applications to rejected
    const applicationIds = applicationsToReject.map(app => app._id);
    
    await Application.updateMany(
      { _id: { $in: applicationIds } },
      {
        $set: { 
          status: 'rejected',
          reviewedAt: new Date()
        },
        $push: {
          statusHistory: {
            status: 'rejected',
            timestamp: new Date(),
            note: 'Position has been filled. Thank you for your application.',
            changedBy: req.user?.id
          }
        }
      }
    );

    // Send rejection emails (non-blocking)
    const emailPromises = applicationsToReject.map(async (application) => {
      const applicant = application.applicantId as any;
      if (applicant && applicant.email) {
        try {
          await emailService.sendRejectionEmail({
            applicantName: applicant.fullName || 'Applicant',
            applicantEmail: applicant.email,
            jobTitle: job.title,
            companyName: 'HireSense'
          });
        } catch (err) {
          console.error(`Failed to send rejection email to ${applicant.email}:`, err);
        }
      }
    });

    // Execute emails in background
    Promise.all(emailPromises).catch(err => console.error('Bulk email error:', err));

    // Try to add candidates to talent pool (non-blocking)
    applicationsToReject.forEach(async (app) => {
      try {
        await talentPoolService.addToTalentPoolOnRejection(app._id as any, req.user?.id as any);
      } catch (err) {
        console.error(`Failed to add ${app._id} to talent pool:`, err);
      }
    });

    res.status(200).json({
      status: 'success',
      message: `Successfully rejected ${applicationsToReject.length} application(s). Rejection emails are being sent.`,
      data: { 
        rejectedCount: applicationsToReject.length,
        jobTitle: job.title
      }
    });
  } catch (error) {
    next(error);
  }
};

// Bulk shortlist multiple applications
export const bulkShortlistApplications = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { jobId } = req.params;
    const { applicationIds } = req.body;

    if (!applicationIds || !Array.isArray(applicationIds) || applicationIds.length === 0) {
      throw new AppError('Please provide application IDs to shortlist', 400);
    }

    // Verify job exists and belongs to recruiter
    const job = await Job.findOne({ _id: jobId, recruiterId: req.user?.id });
    if (!job) {
      throw new AppError('Job not found or unauthorized', 404);
    }

    // Bulk update applications to shortlisted
    const result = await Application.updateMany(
      { 
        _id: { $in: applicationIds },
        jobId,
        status: { $nin: ['hired', 'rejected', 'shortlisted'] }
      },
      {
        $set: { 
          status: 'shortlisted',
          reviewedAt: new Date()
        },
        $push: {
          statusHistory: {
            status: 'shortlisted',
            timestamp: new Date(),
            note: 'Shortlisted for further consideration',
            changedBy: req.user?.id
          }
        }
      }
    );

    // Send notification emails (non-blocking)
    const applications = await Application.find({ _id: { $in: applicationIds } })
      .populate('applicantId', 'fullName email');

    applications.forEach(async (app) => {
      const applicant = app.applicantId as any;
      if (applicant?.email) {
        emailService.sendStatusUpdated({
          applicantName: applicant.fullName,
          applicantEmail: applicant.email,
          jobTitle: job.title,
          companyName: 'HireSense',
          newStatus: 'shortlisted',
          note: 'Congratulations! You have been shortlisted for further consideration.',
        }).catch(err => console.error('Email failed:', err));
      }
    });

    res.status(200).json({
      status: 'success',
      message: `Successfully shortlisted ${result.modifiedCount} application(s)`,
      data: { 
        shortlistedCount: result.modifiedCount,
        jobTitle: job.title
      }
    });
  } catch (error) {
    next(error);
  }
};

// Bulk reject specific applications
export const bulkRejectSpecificApplications = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { jobId } = req.params;
    const { applicationIds, rejectionReason, sendFeedback } = req.body;

    if (!applicationIds || !Array.isArray(applicationIds) || applicationIds.length === 0) {
      throw new AppError('Please provide application IDs to reject', 400);
    }

    // Verify job exists and belongs to recruiter
    const job = await Job.findOne({ _id: jobId, recruiterId: req.user?.id });
    if (!job) {
      throw new AppError('Job not found or unauthorized', 404);
    }

    // Bulk update applications to rejected
    const result = await Application.updateMany(
      { 
        _id: { $in: applicationIds },
        jobId,
        status: { $nin: ['hired', 'rejected'] }
      },
      {
        $set: { 
          status: 'rejected',
          reviewedAt: new Date()
        },
        $push: {
          statusHistory: {
            status: 'rejected',
            timestamp: new Date(),
            note: rejectionReason || 'Application has been reviewed and not selected to proceed.',
            changedBy: req.user?.id
          }
        }
      }
    );

    // Get applications for emails and talent pool
    const applications = await Application.find({ _id: { $in: applicationIds } })
      .populate('applicantId', 'fullName email');

    // Send notification emails and add to talent pool (non-blocking)
    applications.forEach(async (app) => {
      const applicant = app.applicantId as any;
      
      // Try to add to talent pool
      try {
        await talentPoolService.addToTalentPoolOnRejection(app._id as any, req.user?.id as any);
      } catch (err) {
        console.error(`Failed to add to talent pool:`, err);
      }
      
      // Send email if sendFeedback is true
      if (applicant?.email && sendFeedback) {
        emailService.sendStatusUpdated({
          applicantName: applicant.fullName,
          applicantEmail: applicant.email,
          jobTitle: job.title,
          companyName: 'HireSense',
          newStatus: 'rejected',
          note: rejectionReason || undefined,
        }).catch(err => console.error('Email failed:', err));
      }
    });

    res.status(200).json({
      status: 'success',
      message: `Successfully rejected ${result.modifiedCount} application(s)`,
      data: { 
        rejectedCount: result.modifiedCount,
        jobTitle: job.title
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get all hired/selected candidates across all jobs
export const getSelectedCandidates = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Get all jobs posted by this recruiter
    const jobs = await Job.find({ recruiterId: req.user?.id });
    const jobIds = jobs.map(job => job._id);

    if (jobIds.length === 0) {
      return res.status(200).json({
        status: 'success',
        data: { 
          candidates: [],
          stats: { hired: 0, interviewing: 0, shortlisted: 0 }
        }
      });
    }

    // Get all hired/selected/interview status applications
    const applications = await Application.find({
      jobId: { $in: jobIds },
      status: { $in: ['hired', 'interview', 'shortlisted', 'selected'] }
    })
      .populate('applicantId', 'fullName email')
      .populate('jobId', 'title department')
      .sort({ reviewedAt: -1 });

    // Get applicant profiles for additional info
    const applicantIds = applications.map(app => (app.applicantId as any)?._id);
    const profiles = await ApplicantProfile.find({ userId: { $in: applicantIds } });
    const profileMap = new Map(profiles.map(p => [p.userId.toString(), p]));

    // Enhance applications with profile data
    const candidates = applications.map(app => {
      const applicant = app.applicantId as any;
      const job = app.jobId as any;
      const profile = profileMap.get(applicant?._id?.toString());

      return {
        id: app._id,
        applicantId: applicant?._id,
        name: applicant?.fullName || 'Unknown',
        email: applicant?.email || '',
        jobTitle: job?.title || 'Unknown Position',
        department: job?.department || 'General',
        status: app.status,
        score: app.aiInsights?.overallScore || 0,
        skills: profile?.skills?.slice(0, 5) || [],
        experience: profile?.yearsOfExperience || 0,
        githubScore: profile?.githubAnalysis?.score || 0,
        hiredAt: app.status === 'hired' ? app.reviewedAt : null,
        shortlistedAt: app.reviewedAt,
      };
    });

    // Calculate stats
    const stats = {
      hired: applications.filter(app => app.status === 'hired').length,
      interviewing: applications.filter(app => app.status === 'interview').length,
      shortlisted: applications.filter(app => app.status === 'shortlisted' || app.status === 'selected').length,
    };

    res.status(200).json({
      status: 'success',
      data: { candidates, stats }
    });
  } catch (error) {
    next(error);
  }
};

// Generate rejection feedback with AI
export const generateRejectionFeedback = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { rejectionReason, customReason } = req.body;

    const application = await Application.findById(id)
      .populate('applicantId', 'fullName email')
      .populate('jobId', 'title requiredSkills');

    if (!application) {
      throw new AppError('Application not found', 404);
    }

    const applicant = application.applicantId as any;
    const job = application.jobId as any;

    // Get applicant profile for skills
    const profile = await ApplicantProfile.findOne({ userId: applicant._id });

    const feedback = await rejectionFeedbackService.generateRejectionFeedback({
      candidateName: applicant.fullName,
      jobTitle: job.title,
      skills: profile?.skills || [],
      requiredSkills: job.requiredSkills || [],
      aiInsights: application.aiInsights ? {
        overallScore: application.aiInsights.overallScore,
        skillMatch: application.aiInsights.skillMatch,
        experienceScore: application.aiInsights.experienceScore,
        gaps: application.aiInsights.gaps
      } : undefined,
      rejectionReason: rejectionReason || 'custom',
      customReason
    });

    res.status(200).json({
      status: 'success',
      data: { feedback }
    });
  } catch (error) {
    next(error);
  }
};

// Get available rejection reasons
export const getRejectionReasons = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const reasons = rejectionFeedbackService.getRejectionReasons();
    res.status(200).json({
      status: 'success',
      data: { reasons }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all applications for recruiter with advanced filters
 * Supports: status, job, AI score, search, interview status, sorting, pagination
 */
export const getAllApplicationsForRecruiter = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Get all jobs posted by this recruiter
    const jobs = await Job.find({ recruiterId: req.user?.id });
    const jobIds = jobs.map(job => job._id);

    if (jobIds.length === 0) {
      return res.status(200).json({
        status: 'success',
        data: {
          applications: [],
          pagination: {
            total: 0,
            page: 1,
            limit: 20,
            totalPages: 0
          },
          filterOptions: {
            jobs: [],
            statuses: []
          }
        }
      });
    }

    // Parse query parameters
    const {
      status,           // Comma-separated: 'pending,reviewing'
      jobId,            // Single job ID
      scoreMin,         // Min AI score (0-100)
      scoreMax,         // Max AI score (0-100)
      recommendation,   // 'select' | 'review' | 'reject'
      confidenceLevel,  // 'low' | 'medium' | 'high'
      hasInterview,     // 'true' | 'false'
      interviewStatus,  // 'scheduled' | 'completed' | 'cancelled'
      searchTerm,       // Search in name/email
      dateFrom,         // Application date range start
      dateTo,           // Application date range end
      sortBy = 'appliedAt',  // Sort field
      sortOrder = 'desc',    // 'asc' | 'desc'
      page = '1',
      limit = '20'
    } = req.query;

    // Build MongoDB query
    const query: any = {
      jobId: { $in: jobIds }
    };

    // Status filter (supports multiple)
    if (status) {
      const statuses = (status as string).split(',');
      query.status = { $in: statuses };
    }

    // Job filter
    if (jobId) {
      query.jobId = jobId;
    }

    // AI Score range filter
    if (scoreMin !== undefined || scoreMax !== undefined) {
      query['aiInsights.overallScore'] = {};
      if (scoreMin !== undefined) {
        query['aiInsights.overallScore'].$gte = Number(scoreMin);
      }
      if (scoreMax !== undefined) {
        query['aiInsights.overallScore'].$lte = Number(scoreMax);
      }
    }

    // AI Recommendation filter
    if (recommendation) {
      query['aiInsights.recommendation'] = recommendation;
    }

    // Confidence Level filter
    if (confidenceLevel) {
      query['aiInsights.confidenceLevel'] = confidenceLevel;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      query.appliedAt = {};
      if (dateFrom) {
        query.appliedAt.$gte = new Date(dateFrom as string);
      }
      if (dateTo) {
        query.appliedAt.$lte = new Date(dateTo as string);
      }
    }

    // Get applications with populated data
    let applicationsQuery = Application.find(query)
      .populate('applicantId', 'fullName email')
      .populate('jobId', 'title requiredSkills experienceLevel jobCategory department');

    // Search filter (name or email)
    if (searchTerm) {
      const applications = await applicationsQuery.lean();
      const searchLower = (searchTerm as string).toLowerCase();
      const filtered = applications.filter((app: any) => {
        const name = app.applicantId?.fullName?.toLowerCase() || '';
        const email = app.applicantId?.email?.toLowerCase() || '';
        return name.includes(searchLower) || email.includes(searchLower);
      });
      
      // Apply interview filter if needed
      let finalResults = filtered;
      if (hasInterview !== undefined || interviewStatus) {
        const appIds = filtered.map((app: any) => app._id);
        const interviews = await Interview.find({ applicationId: { $in: appIds } });
        const interviewMap = new Map(interviews.map(i => [i.applicationId.toString(), i]));
        
        finalResults = filtered.filter((app: any) => {
          const interview = interviewMap.get(app._id.toString());
          
          if (hasInterview === 'true') {
            return interview !== undefined;
          } else if (hasInterview === 'false') {
            return interview === undefined;
          }
          
          if (interviewStatus && interview) {
            return interview.status === interviewStatus;
          }
          
          return true;
        });
      }

      // Sort
      const sortByStr = sortBy as string;
      finalResults.sort((a: any, b: any) => {
        let aVal, bVal;
        if (sortByStr === 'appliedAt') {
          aVal = new Date(a.appliedAt).getTime();
          bVal = new Date(b.appliedAt).getTime();
        } else if (sortByStr === 'score') {
          aVal = a.aiInsights?.overallScore || 0;
          bVal = b.aiInsights?.overallScore || 0;
        } else if (sortByStr === 'name') {
          aVal = a.applicantId?.fullName || '';
          bVal = b.applicantId?.fullName || '';
        } else {
          aVal = 0;
          bVal = 0;
        }
        
        return sortOrder === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
      });

      // Pagination
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const total = finalResults.length;
      const totalPages = Math.ceil(total / limitNum);
      const startIndex = (pageNum - 1) * limitNum;
      const paginatedResults = finalResults.slice(startIndex, startIndex + limitNum);

      return res.status(200).json({
        status: 'success',
        data: {
          applications: paginatedResults,
          pagination: {
            total,
            page: pageNum,
            limit: limitNum,
            totalPages
          },
          filterOptions: {
            jobs: jobs.map(j => ({ _id: j._id, title: j.title })),
            statuses: ['pending', 'under_review', 'reviewing', 'selected', 'shortlisted', 'interview', 'rejected', 'hired']
          }
        }
      });
    }

    // Interview filter (without search)
    if (hasInterview !== undefined || interviewStatus) {
      const allApps = await applicationsQuery.lean();
      const appIds = allApps.map((app: any) => app._id);
      const interviews = await Interview.find({ applicationId: { $in: appIds } });
      const interviewMap = new Map(interviews.map(i => [i.applicationId.toString(), i]));
      
      const filteredApps = allApps.filter((app: any) => {
        const interview = interviewMap.get(app._id.toString());
        
        if (hasInterview === 'true') {
          return interview !== undefined;
        } else if (hasInterview === 'false') {
          return interview === undefined;
        }
        
        if (interviewStatus && interview) {
          return interview.status === interviewStatus;
        }
        
        return true;
      });

      // Sort
      const sortByStr = sortBy as string;
      filteredApps.sort((a: any, b: any) => {
        let aVal, bVal;
        if (sortByStr === 'appliedAt') {
          aVal = new Date(a.appliedAt).getTime();
          bVal = new Date(b.appliedAt).getTime();
        } else if (sortByStr === 'score') {
          aVal = a.aiInsights?.overallScore || 0;
          bVal = b.aiInsights?.overallScore || 0;
        } else if (sortByStr === 'name') {
          aVal = a.applicantId?.fullName || '';
          bVal = b.applicantId?.fullName || '';
        } else {
          aVal = 0;
          bVal = 0;
        }
        
        return sortOrder === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
      });

      // Pagination
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const total = filteredApps.length;
      const totalPages = Math.ceil(total / limitNum);
      const startIndex = (pageNum - 1) * limitNum;
      const paginatedResults = filteredApps.slice(startIndex, startIndex + limitNum);

      return res.status(200).json({
        status: 'success',
        data: {
          applications: paginatedResults,
          pagination: {
            total,
            page: pageNum,
            limit: limitNum,
            totalPages
          },
          filterOptions: {
            jobs: jobs.map(j => ({ _id: j._id, title: j.title })),
            statuses: ['pending', 'under_review', 'reviewing', 'selected', 'shortlisted', 'interview', 'rejected', 'hired']
          }
        }
      });
    }

    // No search/interview filter - use standard query with sorting and pagination
    const sortByStr = sortBy as string;
    const sortOptions: any = {};
    if (sortByStr === 'score') {
      sortOptions['aiInsights.overallScore'] = sortOrder === 'asc' ? 1 : -1;
    } else if (sortByStr === 'name') {
      sortOptions['applicantId.fullName'] = sortOrder === 'asc' ? 1 : -1;
    } else {
      sortOptions[sortByStr] = sortOrder === 'asc' ? 1 : -1;
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    // Get total count for pagination
    const total = await Application.countDocuments(query);
    const totalPages = Math.ceil(total / limitNum);

    // Get paginated results
    const applications = await applicationsQuery
      .sort(sortOptions)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    res.status(200).json({
      status: 'success',
      data: {
        applications,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages
        },
        filterOptions: {
          jobs: jobs.map(j => ({ _id: j._id, title: j.title })),
          statuses: ['pending', 'under_review', 'reviewing', 'selected', 'shortlisted', 'interview', 'rejected', 'hired']
        }
      }
    });
  } catch (error) {
    next(error);
  }
};
