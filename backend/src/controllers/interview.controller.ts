import { Response, NextFunction } from 'express';
import { Interview } from '../models/Interview.model';
import { Application } from '../models/Application.model';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';
import { emailService } from '../services/email.service';
import { DropOffDetectionService } from '../services/dropoff-detection.service';

/**
 * Check if a time slot is available (no conflicts)
 */
export const checkAvailability = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { date, duration = 60 } = req.query;

    if (!date) {
      throw new AppError('Date is required', 400);
    }

    const selectedDate = new Date(date as string);
    const durationMinutes = parseInt(duration as string);

    // Get all interviews for the selected date
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingInterviews = await Interview.find({
      scheduledTime: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      status: { $in: ['scheduled', 'rescheduled'] }
    }).sort({ scheduledTime: 1 });

    // Generate available time slots (9 AM to 6 PM, 30-minute intervals)
    const availableSlots = [];
    const workdayStart = 9; // 9 AM
    const workdayEnd = 18; // 6 PM
    
    for (let hour = workdayStart; hour < workdayEnd; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const slotTime = new Date(selectedDate);
        slotTime.setHours(hour, minute, 0, 0);
        
        const slotEndTime = new Date(slotTime);
        slotEndTime.setMinutes(slotEndTime.getMinutes() + durationMinutes);

        // Check if slot end time is within workday
        if (slotEndTime.getHours() >= workdayEnd) {
          continue;
        }

        // Check for conflicts with existing interviews
        let hasConflict = false;
        for (const interview of existingInterviews) {
          const interviewStart = new Date(interview.scheduledTime);
          const interviewEnd = new Date(interviewStart);
          interviewEnd.setMinutes(interviewEnd.getMinutes() + interview.duration);

          // Check if slot overlaps with existing interview
          if (
            (slotTime >= interviewStart && slotTime < interviewEnd) ||
            (slotEndTime > interviewStart && slotEndTime <= interviewEnd) ||
            (slotTime <= interviewStart && slotEndTime >= interviewEnd)
          ) {
            hasConflict = true;
            break;
          }
        }

        if (!hasConflict) {
          availableSlots.push({
            startTime: slotTime.toISOString(),
            endTime: slotEndTime.toISOString(),
            displayTime: `${slotTime.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: true 
            })} - ${slotEndTime.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: true 
            })}`,
          });
        }
      }
    }

    res.status(200).json({
      status: 'success',
      data: {
        date: selectedDate.toISOString(),
        availableSlots,
        bookedSlots: existingInterviews.map(interview => ({
          startTime: interview.scheduledTime,
          duration: interview.duration,
          endTime: new Date(new Date(interview.scheduledTime).getTime() + interview.duration * 60000)
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Schedule a new interview
 */
export const scheduleInterview = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { applicationId, scheduledTime, duration = 60, meetingLink, type, notes } = req.body;

    if (!applicationId || !scheduledTime) {
      throw new AppError('Application ID and scheduled time are required', 400);
    }

    // Verify application exists
    const application = await Application.findById(applicationId)
      .populate('applicantId', 'fullName email')
      .populate('jobId', 'title');

    if (!application) {
      throw new AppError('Application not found', 404);
    }

    const interviewTime = new Date(scheduledTime);
    const interviewEndTime = new Date(interviewTime.getTime() + duration * 60000);

    // Check for time conflicts
    const conflicts = await Interview.find({
      scheduledTime: {
        $gte: new Date(interviewTime.getTime() - 24 * 60 * 60 * 1000), // Check same day
        $lte: new Date(interviewTime.getTime() + 24 * 60 * 60 * 1000)
      },
      status: { $in: ['scheduled', 'rescheduled'] }
    });

    for (const existingInterview of conflicts) {
      const existingStart = new Date(existingInterview.scheduledTime);
      const existingEnd = new Date(existingStart.getTime() + existingInterview.duration * 60000);

      if (
        (interviewTime >= existingStart && interviewTime < existingEnd) ||
        (interviewEndTime > existingStart && interviewEndTime <= existingEnd) ||
        (interviewTime <= existingStart && interviewEndTime >= existingEnd)
      ) {
        throw new AppError('Time slot conflict detected. Please choose a different time.', 409);
      }
    }

    // Create interview
    const interview = await Interview.create({
      applicationId,
      scheduledTime: interviewTime,
      duration,
      meetingLink: meetingLink || '',
      type: type || 'Technical',
      notes: notes || ''
    });

    // Update application status to interview
    application.status = 'interview';
    application.statusHistory.push({
      status: 'interview',
      timestamp: new Date(),
      note: `Interview scheduled for ${interviewTime.toLocaleString()}`,
      changedBy: req.user?.id as any
    });
    await application.save();

    // Send interview scheduled email (non-blocking)
    const applicant = application.applicantId as any;
    const job = application.jobId as any;
    
    if (applicant && job) {
      emailService.sendInterviewScheduled({
        applicantName: applicant.fullName,
        applicantEmail: applicant.email,
        jobTitle: job.title,
        companyName: 'HireSense',
        interviewDate: emailService.formatDate(interviewTime),
        interviewTime: emailService.formatTime(interviewTime),
        duration,
        type: type || 'Technical',
        meetingLink: meetingLink || undefined,
        notes: notes || undefined,
        interviewId: interview._id.toString(),
      }).catch(err => console.error('Email failed:', err));
    }

    res.status(201).json({
      status: 'success',
      message: '📅 Interview scheduled successfully. Candidate notified.',
      data: { 
        interview,
        applicant: application.applicantId,
        job: application.jobId
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all interviews for a recruiter
 */
export const getInterviews = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, date } = req.query;
    
    const filter: any = {};
    
    if (status) {
      filter.status = status;
    }

    if (date) {
      const selectedDate = new Date(date as string);
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      filter.scheduledTime = {
        $gte: startOfDay,
        $lte: endOfDay
      };
    }

    const interviews = await Interview.find(filter)
      .populate({
        path: 'applicationId',
        populate: [
          { path: 'applicantId', select: 'fullName email' },
          { path: 'jobId', select: 'title department' }
        ]
      })
      .sort({ scheduledTime: 1 });

    res.status(200).json({
      status: 'success',
      results: interviews.length,
      data: { interviews }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update interview (reschedule or cancel)
 */
export const updateInterview = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { scheduledTime, duration, meetingLink, type, status, notes } = req.body;

    const interview = await Interview.findById(id);
    if (!interview) {
      throw new AppError('Interview not found', 404);
    }

    // If rescheduling, check for conflicts
    if (scheduledTime && scheduledTime !== interview.scheduledTime.toISOString()) {
      const newTime = new Date(scheduledTime);
      const newDuration = duration || interview.duration;
      const newEndTime = new Date(newTime.getTime() + newDuration * 60000);

      const conflicts = await Interview.find({
        _id: { $ne: id },
        scheduledTime: {
          $gte: new Date(newTime.getTime() - 24 * 60 * 60 * 1000),
          $lte: new Date(newTime.getTime() + 24 * 60 * 60 * 1000)
        },
        status: { $in: ['scheduled', 'rescheduled'] }
      });

      for (const existingInterview of conflicts) {
        const existingStart = new Date(existingInterview.scheduledTime);
        const existingEnd = new Date(existingStart.getTime() + existingInterview.duration * 60000);

        if (
          (newTime >= existingStart && newTime < existingEnd) ||
          (newEndTime > existingStart && newEndTime <= existingEnd) ||
          (newTime <= existingStart && newEndTime >= existingEnd)
        ) {
          throw new AppError('Time slot conflict detected. Please choose a different time.', 409);
        }
      }

      interview.scheduledTime = newTime;
      interview.status = 'rescheduled';
    }

    if (duration) interview.duration = duration;
    if (meetingLink) interview.meetingLink = meetingLink;
    if (type) interview.type = type;
    if (status) interview.status = status;
    if (notes) interview.notes = notes;

    await interview.save();

    // Send interview update email if rescheduled (non-blocking)
    if (scheduledTime && scheduledTime !== interview.scheduledTime.toISOString()) {
      const populatedInterview = await Interview.findById(id)
        .populate({
          path: 'applicationId',
          populate: [
            { path: 'applicantId', select: 'fullName email' },
            { path: 'jobId', select: 'title' }
          ]
        });
      
      if (populatedInterview && populatedInterview.applicationId) {
        const app = populatedInterview.applicationId as any;
        const applicant = app.applicantId;
        const job = app.jobId;
        
        if (applicant && job) {
          const newTime = new Date(scheduledTime);
          emailService.sendInterviewUpdated({
            applicantName: applicant.fullName,
            applicantEmail: applicant.email,
            jobTitle: job.title,
            companyName: 'HireSense',
            interviewDate: emailService.formatDate(newTime),
            interviewTime: emailService.formatTime(newTime),
            duration: interview.duration,
            type: interview.type,
            meetingLink: interview.meetingLink || undefined,
            action: 'rescheduled',
          }).catch(err => console.error('Email failed:', err));
        }
      }
    }

    res.status(200).json({
      status: 'success',
      message: '🔄 Interview updated successfully. Candidate notified.',
      data: { interview }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete/Cancel interview
 */
export const deleteInterview = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const interview = await Interview.findByIdAndUpdate(
      id,
      { status: 'cancelled' },
      { new: true }
    ).populate({
      path: 'applicationId',
      populate: [
        { path: 'applicantId', select: 'fullName email' },
        { path: 'jobId', select: 'title' }
      ]
    });

    if (!interview) {
      throw new AppError('Interview not found', 404);
    }

    // Send interview cancelled email (non-blocking)
    if (interview.applicationId) {
      const app = interview.applicationId as any;
      const applicant = app?.applicantId;
      const job = app?.jobId;
      
      if (applicant && job) {
        const interviewTime = new Date(interview.scheduledTime);
        emailService.sendInterviewUpdated({
          applicantName: applicant.fullName,
          applicantEmail: applicant.email,
          jobTitle: job.title,
          companyName: 'HireSense',
          interviewDate: emailService.formatDate(interviewTime),
          interviewTime: emailService.formatTime(interviewTime),
          duration: interview.duration,
          type: interview.type,
          meetingLink: interview.meetingLink || undefined,
          action: 'cancelled',
        }).catch(err => console.error('Email failed:', err));
      }
    }

    res.status(200).json({
      status: 'success',
      message: '❌ Interview cancelled successfully. Candidate notified.',
      data: { interview }
    });
  } catch (error) {
    next(error);
  }
};
// ============= DROP-OFF DETECTION ENDPOINTS =============

/**
 * Get interviews needing attention (high/medium risk)
 */
export const getInterviewsAtRisk = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await DropOffDetectionService.getInterviewsNeedingAttention();

    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get drop-off risk analytics for dashboard
 */
export const getDropOffAnalytics = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const analytics = await DropOffDetectionService.getDropOffAnalytics();

    res.status(200).json({
      status: 'success',
      data: analytics
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Confirm interview attendance (candidate action)
 */
export const confirmInterviewAttendance = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { interviewId } = req.params;

    if (!interviewId) {
      throw new AppError('Interview ID is required', 400);
    }

    const interview = await DropOffDetectionService.confirmAttendance(interviewId);

    if (!interview) {
      throw new AppError('Interview not found', 404);
    }

    res.status(200).json({
      status: 'success',
      message: '✅ Interview attendance confirmed!',
      data: { interview }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send reminder to candidate
 */
export const sendInterviewReminder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { interviewId } = req.params;

    if (!interviewId) {
      throw new AppError('Interview ID is required', 400);
    }

    const interview = await Interview.findById(interviewId)
      .populate({
        path: 'applicationId',
        populate: { path: 'applicantId jobId' }
      });

    if (!interview) {
      throw new AppError('Interview not found', 404);
    }

    const application = interview.applicationId as any;
    const applicant = application?.applicantId;
    const job = application?.jobId;

    if (applicant && job) {
      const interviewTime = new Date(interview.scheduledTime);
      
      // Send reminder email
      await emailService.sendInterviewReminder({
        applicantName: applicant.fullName,
        applicantEmail: applicant.email,
        jobTitle: job.title,
        companyName: 'HireSense',
        interviewDate: emailService.formatDate(interviewTime),
        interviewTime: emailService.formatTime(interviewTime),
        duration: interview.duration,
        type: interview.type,
        meetingLink: interview.meetingLink || undefined,
        interviewId: interviewId,
      });

      // Record that reminder was sent
      await DropOffDetectionService.recordReminderSent(interviewId);
    }

    res.status(200).json({
      status: 'success',
      message: '📧 Reminder sent to candidate successfully!',
      data: { 
        interview,
        reminderCount: (interview.reminderCount || 0) + 1
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Record candidate action (viewing interview details, etc.)
 */
export const recordCandidateAction = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { interviewId } = req.params;

    if (!interviewId) {
      throw new AppError('Interview ID is required', 400);
    }

    const interview = await DropOffDetectionService.recordCandidateAction(interviewId);

    if (!interview) {
      throw new AppError('Interview not found', 404);
    }

    res.status(200).json({
      status: 'success',
      message: 'Candidate activity recorded',
      data: { interview }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single interview with drop-off risk assessment
 */
export const getInterviewWithRisk = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { interviewId } = req.params;

    if (!interviewId) {
      throw new AppError('Interview ID is required', 400);
    }

    const interview = await Interview.findById(interviewId)
      .populate({
        path: 'applicationId',
        populate: { path: 'applicantId jobId' }
      });

    if (!interview) {
      throw new AppError('Interview not found', 404);
    }

    // Calculate fresh risk assessment
    const riskAssessment = DropOffDetectionService.calculateRisk(interview);

    res.status(200).json({
      status: 'success',
      data: { 
        interview,
        riskAssessment
      }
    });
  } catch (error) {
    next(error);
  }
};