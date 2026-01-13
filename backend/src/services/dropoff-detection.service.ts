/**
 * Interview Drop-off Detection Service
 * 
 * Ethical, rule-based system to identify candidates at risk of missing interviews.
 * This is a "risk signal" NOT a "verdict" - helps recruiters take proactive action.
 * 
 * Risk Calculation Logic:
 * - LOW: Candidate confirmed OR recent activity (within 24h)
 * - MEDIUM: No confirmation + inactive for 48+ hours
 * - HIGH: Interview within 24h + no confirmation + no reminder response
 */

import { Interview, IInterview } from '../models/Interview.model';

export interface DropOffAssessment {
  risk: 'low' | 'medium' | 'high';
  reasons: string[];
  suggestedAction: string;
  hoursUntilInterview: number;
  hoursSinceLastAction: number;
  confirmationStatus: boolean;
}

export class DropOffDetectionService {
  
  /**
   * Calculate drop-off risk for a single interview
   */
  static calculateRisk(interview: IInterview): DropOffAssessment {
    const now = new Date();
    const scheduledTime = new Date(interview.scheduledTime);
    const lastAction = interview.candidateLastActionAt 
      ? new Date(interview.candidateLastActionAt) 
      : new Date(interview.createdAt);
    
    // Calculate time differences
    const hoursUntilInterview = (scheduledTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    const hoursSinceLastAction = (now.getTime() - lastAction.getTime()) / (1000 * 60 * 60);
    
    const reasons: string[] = [];
    let risk: 'low' | 'medium' | 'high' = 'low';
    let suggestedAction = 'No action needed';
    
    // Rule 1: Confirmed candidates are low risk
    if (interview.candidateConfirmed) {
      reasons.push('✅ Candidate has confirmed attendance');
      
      // But check if it's been a while since confirmation
      if (hoursSinceLastAction > 72) {
        reasons.push('⚠️ No activity for 3+ days since confirmation');
        risk = 'medium';
        suggestedAction = 'Send a friendly reminder with interview details';
      } else {
        suggestedAction = 'Monitor - candidate engagement looks good';
      }
      
      return { risk, reasons, suggestedAction, hoursUntilInterview, hoursSinceLastAction, confirmationStatus: true };
    }
    
    // Rule 2: Not confirmed - assess based on timing
    reasons.push('❌ Candidate has not confirmed attendance');
    
    // Check interview proximity
    if (hoursUntilInterview <= 24) {
      // Interview is very soon
      if (hoursSinceLastAction > 24) {
        // HIGH RISK: Interview tomorrow, no confirmation, no recent activity
        risk = 'high';
        reasons.push('🚨 Interview within 24 hours');
        reasons.push(`⏰ No activity for ${Math.round(hoursSinceLastAction)} hours`);
        
        if (interview.reminderSentAt) {
          const hoursSinceReminder = (now.getTime() - new Date(interview.reminderSentAt).getTime()) / (1000 * 60 * 60);
          if (hoursSinceReminder > 12) {
            reasons.push('📧 Reminder sent but no response');
            suggestedAction = 'Call candidate directly or prepare backup candidate';
          } else {
            suggestedAction = 'Wait for reminder response, prepare backup option';
          }
        } else {
          suggestedAction = 'Send urgent reminder immediately';
        }
      } else {
        // Medium risk - interview soon but candidate was active recently
        risk = 'medium';
        reasons.push('🚨 Interview within 24 hours');
        suggestedAction = 'Send confirmation request urgently';
      }
    } else if (hoursUntilInterview <= 48) {
      // Interview in 1-2 days
      if (hoursSinceLastAction > 48) {
        risk = 'high';
        reasons.push('📅 Interview within 48 hours');
        reasons.push(`⏰ No activity for ${Math.round(hoursSinceLastAction)} hours`);
        suggestedAction = 'Send reminder and request confirmation';
      } else {
        risk = 'medium';
        reasons.push('📅 Interview within 48 hours');
        suggestedAction = 'Send friendly reminder to confirm';
      }
    } else if (hoursUntilInterview <= 72) {
      // Interview in 2-3 days
      if (hoursSinceLastAction > 48) {
        risk = 'medium';
        reasons.push('📅 Interview in 2-3 days');
        reasons.push(`⏰ No activity for ${Math.round(hoursSinceLastAction)} hours`);
        suggestedAction = 'Send confirmation request';
      } else {
        risk = 'low';
        reasons.push('📅 Interview in 2-3 days');
        reasons.push('✅ Recent candidate activity detected');
        suggestedAction = 'Monitor and send reminder in 24 hours if no confirmation';
      }
    } else {
      // Interview is more than 3 days away
      if (hoursSinceLastAction > 72) {
        risk = 'medium';
        reasons.push(`📅 Interview in ${Math.round(hoursUntilInterview / 24)} days`);
        reasons.push(`⏰ No activity for ${Math.round(hoursSinceLastAction)} hours`);
        suggestedAction = 'Send engagement email with interview details';
      } else {
        risk = 'low';
        reasons.push(`📅 Interview in ${Math.round(hoursUntilInterview / 24)} days`);
        suggestedAction = 'No immediate action - schedule reminder for 48h before';
      }
    }
    
    return { risk, reasons, suggestedAction, hoursUntilInterview, hoursSinceLastAction, confirmationStatus: false };
  }
  
  /**
   * Update drop-off risk for a single interview
   */
  static async updateInterviewRisk(interviewId: string): Promise<IInterview | null> {
    const interview = await Interview.findById(interviewId);
    if (!interview) return null;
    
    const assessment = this.calculateRisk(interview);
    
    interview.dropOffRisk = assessment.risk;
    interview.dropOffReasons = assessment.reasons;
    
    await interview.save();
    return interview;
  }
  
  /**
   * Update drop-off risk for all scheduled interviews
   */
  static async updateAllInterviewRisks(): Promise<{ updated: number; highRisk: number; mediumRisk: number }> {
    const interviews = await Interview.find({ status: 'scheduled' });
    
    let highRisk = 0;
    let mediumRisk = 0;
    
    for (const interview of interviews) {
      const assessment = this.calculateRisk(interview);
      
      interview.dropOffRisk = assessment.risk;
      interview.dropOffReasons = assessment.reasons;
      await interview.save();
      
      if (assessment.risk === 'high') highRisk++;
      if (assessment.risk === 'medium') mediumRisk++;
    }
    
    return { updated: interviews.length, highRisk, mediumRisk };
  }
  
  /**
   * Get all interviews that need attention (high/medium risk)
   */
  static async getInterviewsNeedingAttention(): Promise<{
    highRisk: IInterview[];
    mediumRisk: IInterview[];
    summary: { total: number; highRisk: number; mediumRisk: number };
  }> {
    // First update all risks
    await this.updateAllInterviewRisks();
    
    const highRisk = await Interview.find({ 
      status: 'scheduled',
      dropOffRisk: 'high'
    }).populate({
      path: 'applicationId',
      populate: { path: 'candidateId jobId' }
    }).sort({ scheduledTime: 1 });
    
    const mediumRisk = await Interview.find({
      status: 'scheduled', 
      dropOffRisk: 'medium'
    }).populate({
      path: 'applicationId',
      populate: { path: 'candidateId jobId' }
    }).sort({ scheduledTime: 1 });
    
    return {
      highRisk,
      mediumRisk,
      summary: {
        total: highRisk.length + mediumRisk.length,
        highRisk: highRisk.length,
        mediumRisk: mediumRisk.length
      }
    };
  }
  
  /**
   * Record candidate action to update last activity time
   */
  static async recordCandidateAction(interviewId: string): Promise<IInterview | null> {
    const interview = await Interview.findByIdAndUpdate(
      interviewId,
      { 
        candidateLastActionAt: new Date(),
      },
      { new: true }
    );
    
    if (interview) {
      return this.updateInterviewRisk(interviewId);
    }
    return null;
  }
  
  /**
   * Confirm interview attendance
   */
  static async confirmAttendance(interviewId: string): Promise<IInterview | null> {
    const interview = await Interview.findByIdAndUpdate(
      interviewId,
      {
        candidateConfirmed: true,
        candidateConfirmedAt: new Date(),
        candidateLastActionAt: new Date(),
        dropOffRisk: 'low',
        dropOffReasons: ['✅ Candidate has confirmed attendance']
      },
      { new: true }
    );
    
    return interview;
  }
  
  /**
   * Record that a reminder was sent
   */
  static async recordReminderSent(interviewId: string): Promise<IInterview | null> {
    const interview = await Interview.findById(interviewId);
    if (!interview) return null;
    
    interview.reminderSentAt = new Date();
    interview.reminderCount = (interview.reminderCount || 0) + 1;
    await interview.save();
    
    return this.updateInterviewRisk(interviewId);
  }
  
  /**
   * Get drop-off analytics for dashboard
   */
  static async getDropOffAnalytics(): Promise<{
    totalScheduled: number;
    confirmed: number;
    unconfirmed: number;
    highRisk: number;
    mediumRisk: number;
    lowRisk: number;
    confirmationRate: number;
    riskBreakdown: { risk: string; count: number; percentage: number }[];
  }> {
    const scheduled = await Interview.find({ status: 'scheduled' });
    
    const confirmed = scheduled.filter(i => i.candidateConfirmed).length;
    const unconfirmed = scheduled.length - confirmed;
    
    const highRisk = scheduled.filter(i => i.dropOffRisk === 'high').length;
    const mediumRisk = scheduled.filter(i => i.dropOffRisk === 'medium').length;
    const lowRisk = scheduled.filter(i => i.dropOffRisk === 'low').length;
    
    const total = scheduled.length || 1; // Avoid division by zero
    
    return {
      totalScheduled: scheduled.length,
      confirmed,
      unconfirmed,
      highRisk,
      mediumRisk,
      lowRisk,
      confirmationRate: Math.round((confirmed / total) * 100),
      riskBreakdown: [
        { risk: 'High', count: highRisk, percentage: Math.round((highRisk / total) * 100) },
        { risk: 'Medium', count: mediumRisk, percentage: Math.round((mediumRisk / total) * 100) },
        { risk: 'Low', count: lowRisk, percentage: Math.round((lowRisk / total) * 100) }
      ]
    };
  }
}

export default DropOffDetectionService;
