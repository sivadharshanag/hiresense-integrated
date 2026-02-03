import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import Notification from '../models/Notification.model';
import { Application } from '../models/Application.model';
import { Job } from '../models/Job.model';
import { ApplicantProfile } from '../models/ApplicantProfile.model';
import { AppError } from '../middleware/errorHandler';

// Get all notifications for the current user
export const getNotifications = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const query: any = { userId: req.user?.id };
    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('data.jobId', 'title company location employmentType'),
      Notification.countDocuments(query)
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        notifications,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get unread notification count
export const getUnreadCount = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const count = await Notification.countDocuments({
      userId: req.user?.id,
      isRead: false
    });

    res.status(200).json({
      status: 'success',
      data: { count }
    });
  } catch (error) {
    next(error);
  }
};

// Mark a notification as read
export const markAsRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId: req.user?.id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      throw new AppError('Notification not found', 404);
    }

    res.status(200).json({
      status: 'success',
      data: { notification }
    });
  } catch (error) {
    next(error);
  }
};

// Mark all notifications as read
export const markAllAsRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await Notification.updateMany(
      { userId: req.user?.id, isRead: false },
      { isRead: true }
    );

    res.status(200).json({
      status: 'success',
      message: 'All notifications marked as read'
    });
  } catch (error) {
    next(error);
  }
};

// Delete a notification
export const deleteNotification = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOneAndDelete({
      _id: id,
      userId: req.user?.id
    });

    if (!notification) {
      throw new AppError('Notification not found', 404);
    }

    res.status(200).json({
      status: 'success',
      message: 'Notification deleted'
    });
  } catch (error) {
    next(error);
  }
};

// Auto-apply from a job match notification
export const autoApplyFromNotification = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Find the notification
    const notification = await Notification.findOne({
      _id: id,
      userId: req.user?.id,
      type: 'job_match'
    });

    if (!notification) {
      throw new AppError('Notification not found', 404);
    }

    const jobId = notification.data.jobId;
    if (!jobId) {
      throw new AppError('Job not found in notification', 400);
    }

    // Check if job exists and is still active
    const job = await Job.findById(jobId);
    if (!job) {
      throw new AppError('Job no longer exists', 404);
    }
    if (job.status !== 'active') {
      throw new AppError('This job is no longer accepting applications', 400);
    }

    // Check if already applied
    const existingApplication = await Application.findOne({
      applicantId: req.user?.id,
      jobId
    });

    if (existingApplication) {
      throw new AppError('You have already applied for this job', 409);
    }

    // Get applicant profile for GitHub score
    const applicantProfile = await ApplicantProfile.findOne({ userId: req.user?.id });

    // Create initial AI insights with GitHub score if available
    const initialAiInsights = applicantProfile?.githubAnalysis?.score ? {
      skillMatch: notification.data.matchPercentage || 0,
      experienceScore: 0,
      githubScore: applicantProfile.githubAnalysis.score,
      educationScore: 0,
      overallScore: 0,
      strengths: notification.data.matchedSkills || [],
      gaps: [],
      recommendation: 'review' as const,
      confidence: 0
    } : undefined;

    // Create the application
    const application = await Application.create({
      applicantId: req.user?.id,
      jobId,
      coverLetter: `Auto-applied based on ${notification.data.matchPercentage}% skill match.`,
      status: 'pending',
      statusHistory: [{
        status: 'pending',
        timestamp: new Date(),
        note: 'Auto-applied from job match notification'
      }],
      aiInsights: initialAiInsights
    });

    // Increment applicant count
    await Job.findByIdAndUpdate(jobId, { $inc: { applicantCount: 1 } });

    // Mark notification as read
    notification.isRead = true;
    await notification.save();

    res.status(201).json({
      status: 'success',
      message: '✅ Successfully applied for the job!',
      data: { 
        application,
        jobTitle: job.title,
        company: job.company
      }
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to create job match notifications (used by job.controller)
export const createJobMatchNotification = async (
  userId: string,
  jobId: string,
  jobTitle: string,
  company: string,
  matchPercentage: number,
  matchedSkills: string[]
) => {
  try {
    await Notification.create({
      userId,
      type: 'job_match',
      title: `New Job Match: ${jobTitle}`,
      message: `You're a ${matchPercentage}% match for ${jobTitle} at ${company}! Your matching skills: ${matchedSkills.slice(0, 3).join(', ')}${matchedSkills.length > 3 ? '...' : ''}`,
      data: {
        jobId,
        matchPercentage,
        matchedSkills
      },
      isRead: false
    });
  } catch (error) {
    console.error('Failed to create job match notification:', error);
  }
};
