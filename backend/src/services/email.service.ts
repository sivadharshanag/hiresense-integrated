import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

// Ensure environment variables are loaded before reading EMAIL_* values
dotenv.config();

// Email configuration interface
interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

// Email data interfaces
interface ApplicationReceivedData {
  applicantName: string;
  applicantEmail: string;
  jobTitle: string;
  companyName: string;
}

interface StatusUpdatedData {
  applicantName: string;
  applicantEmail: string;
  jobTitle: string;
  companyName: string;
  newStatus: string;
  note?: string;
}

interface InterviewScheduledData {
  applicantName: string;
  applicantEmail: string;
  jobTitle: string;
  companyName: string;
  interviewDate: string;
  interviewTime: string;
  duration: number;
  type: string;
  meetingLink?: string;
  notes?: string;
  interviewId?: string;
}

interface InterviewUpdatedData {
  applicantName: string;
  applicantEmail: string;
  jobTitle: string;
  companyName: string;
  interviewDate: string;
  interviewTime: string;
  duration: number;
  type: string;
  meetingLink?: string;
  action: 'rescheduled' | 'cancelled';
}

// 🔐 RECRUITER VERIFICATION DATA
interface RecruiterVerificationData {
  recruiterName: string;
  companyEmail: string;
  companyName: string;
  verificationToken: string;
}

class EmailService {
  private transporter: Transporter | null = null;
  private isEnabled: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    try {
      const emailHost = process.env.EMAIL_HOST;
      const emailPort = process.env.EMAIL_PORT;
      const emailUser = process.env.EMAIL_USER;
      const emailPass = process.env.EMAIL_PASSWORD;

      // Check if email is configured
      if (!emailHost || !emailPort || !emailUser || !emailPass) {
        console.warn('⚠️  Email service not configured. Emails will not be sent.');
        this.isEnabled = false;
        return;
      }

      const config: EmailConfig = {
        host: emailHost,
        port: parseInt(emailPort),
        secure: emailPort === '465', // true for 465, false for other ports
        auth: {
          user: emailUser,
          pass: emailPass,
        },
      };

      this.transporter = nodemailer.createTransport(config);
      this.isEnabled = true;

      console.log('✅ Email service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize email service:', error);
      this.isEnabled = false;
    }
  }

  private async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    if (!this.isEnabled || !this.transporter) {
      console.warn('Email not sent - service disabled');
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: `"HireSense AI" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
      });

      console.log(`📧 Email sent to ${to}: ${subject}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      return false;
    }
  }

  // Template: Application Received
  async sendApplicationReceived(data: ApplicationReceivedData): Promise<boolean> {
    const { applicantName, applicantEmail, jobTitle, companyName } = data;

    const subject = `Application Received - ${jobTitle}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Application Received!</h1>
          </div>
          <div class="content">
            <p>Dear ${applicantName},</p>
            
            <p>Thank you for applying to the <strong>${jobTitle}</strong> position at <strong>${companyName}</strong>.</p>
            
            <p>We have successfully received your application and our team will review it shortly. You will receive an email notification once there's an update on your application status.</p>
            
            <p><strong>What's next?</strong></p>
            <ul>
              <li>Our recruiting team will review your application</li>
              <li>We'll notify you of any status changes</li>
              <li>If shortlisted, we'll reach out to schedule an interview</li>
            </ul>
            
            <p>You can track your application status anytime by logging into your HireSense dashboard.</p>
            
            <p>Best regards,<br>The ${companyName} Hiring Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message from HireSense AI.</p>
            <p>Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(applicantEmail, subject, html);
  }

  // Template: Status Updated
  async sendStatusUpdated(data: StatusUpdatedData): Promise<boolean> {
    const { applicantName, applicantEmail, jobTitle, companyName, newStatus, note } = data;

    // Map status to user-friendly text
    const statusMap: { [key: string]: { title: string; emoji: string; color: string } } = {
      under_review: { title: 'Under Review', emoji: '👀', color: '#3b82f6' },
      shortlisted: { title: 'Shortlisted', emoji: '⭐', color: '#10b981' },
      interview: { title: 'Interview Scheduled', emoji: '📅', color: '#8b5cf6' },
      selected: { title: 'Selected', emoji: '🎉', color: '#22c55e' },
      rejected: { title: 'Not Selected', emoji: '📝', color: '#ef4444' },
    };

    const statusInfo = statusMap[newStatus] || { title: newStatus, emoji: '📋', color: '#667eea' };

    const subject = `Application Status Update - ${jobTitle}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${statusInfo.color}; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .status-badge { display: inline-block; background: ${statusInfo.color}; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin: 10px 0; }
          .note-box { background: white; border-left: 4px solid ${statusInfo.color}; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${statusInfo.emoji} Application Status Updated</h1>
          </div>
          <div class="content">
            <p>Dear ${applicantName},</p>
            
            <p>Your application status for the <strong>${jobTitle}</strong> position at <strong>${companyName}</strong> has been updated.</p>
            
            <p><strong>New Status:</strong></p>
            <div class="status-badge">${statusInfo.title}</div>
            
            ${note ? `
              <div class="note-box">
                <strong>Message from the hiring team:</strong>
                <p>${note}</p>
              </div>
            ` : ''}
            
            ${newStatus === 'selected' ? `
              <p>🎊 <strong>Congratulations!</strong> We're excited to move forward with your application. Our team will be in touch with you shortly regarding the next steps.</p>
            ` : ''}
            
            ${newStatus === 'shortlisted' ? `
              <p>Great news! Your profile has been shortlisted. Our team will review your application in detail and get back to you soon.</p>
            ` : ''}
            
            ${newStatus === 'interview' ? `
              <p>You've been selected for an interview! Please check your email for interview scheduling details.</p>
            ` : ''}
            
            ${newStatus === 'rejected' ? `
              <p>Thank you for your interest in ${companyName}. While we've decided to move forward with other candidates for this position, we encourage you to apply for other opportunities that match your skills.</p>
            ` : ''}
            
            <p>You can view more details by logging into your HireSense dashboard.</p>
            
            <p>Best regards,<br>The ${companyName} Hiring Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message from HireSense AI.</p>
            <p>Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(applicantEmail, subject, html);
  }

  // Template: Interview Scheduled
  async sendInterviewScheduled(data: InterviewScheduledData): Promise<boolean> {
    const { applicantName, applicantEmail, jobTitle, companyName, interviewDate, interviewTime, duration, type, meetingLink, notes, interviewId } = data;

    const subject = `Interview Scheduled - ${jobTitle} at ${companyName}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #8b5cf6 0%, #667eea 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #8b5cf6; }
          .info-row { display: flex; padding: 10px 0; border-bottom: 1px solid #eee; }
          .info-label { font-weight: bold; width: 150px; color: #8b5cf6; }
          .button { display: inline-block; background: #8b5cf6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .note-box { background: #fef3c7; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #f59e0b; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📅 Interview Scheduled</h1>
          </div>
          <div class="content">
            <p>Dear ${applicantName},</p>
            
            <p>Congratulations! We're pleased to inform you that an interview has been scheduled for the <strong>${jobTitle}</strong> position at <strong>${companyName}</strong>.</p>
            
            <div class="info-box">
              <h3 style="margin-top: 0; color: #8b5cf6;">📋 Interview Details</h3>
              <div class="info-row">
                <div class="info-label">📅 Date:</div>
                <div>${interviewDate}</div>
              </div>
              <div class="info-row">
                <div class="info-label">🕐 Time:</div>
                <div>${interviewTime}</div>
              </div>
              <div class="info-row">
                <div class="info-label">⏱️ Duration:</div>
                <div>${duration} minutes</div>
              </div>
              <div class="info-row">
                <div class="info-label">💼 Type:</div>
                <div>${type} Interview</div>
              </div>
              ${meetingLink ? `
                <div class="info-row" style="border-bottom: none;">
                  <div class="info-label">🔗 Meeting Link:</div>
                  <div><a href="${meetingLink}" style="color: #8b5cf6;">${meetingLink}</a></div>
                </div>
              ` : ''}
            </div>
            
            ${notes ? `
              <div class="note-box">
                <strong>📝 Special Instructions:</strong>
                <p style="margin: 5px 0 0 0;">${notes}</p>
              </div>
            ` : ''}
            
            <p><strong>💡 Interview Preparation Tips:</strong></p>
            <ul>
              <li>Review the job description and requirements</li>
              <li>Prepare examples from your past experience</li>
              <li>Test your internet connection and video setup</li>
              <li>Join the meeting 5 minutes early</li>
              <li>Have your resume and portfolio ready</li>
            </ul>
            
            <div style="background: #f0fdf4; border: 2px solid #22c55e; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
              <p style="margin: 0 0 15px 0; font-weight: bold; color: #166534;">📋 Please confirm your attendance</p>
              <a href="${process.env.FRONTEND_URL || 'http://localhost:8080'}/applicant?confirmInterview=${interviewId}" 
                 style="display: inline-block; background: #22c55e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                ✅ Yes, I'll Attend
              </a>
              <p style="margin: 15px 0 0 0; font-size: 12px; color: #666;">Confirming helps us prepare for your interview</p>
            </div>
            
            ${meetingLink ? `
              <center>
                <a href="${meetingLink}" class="button">Join Interview</a>
              </center>
            ` : ''}
            
            <p>If you need to reschedule, please contact us as soon as possible.</p>
            
            <p>Good luck! We look forward to speaking with you.</p>
            
            <p>Best regards,<br>The ${companyName} Hiring Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message from HireSense AI.</p>
            <p>Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(applicantEmail, subject, html);
  }

  // Template: Interview Updated (Rescheduled/Cancelled)
  async sendInterviewUpdated(data: InterviewUpdatedData): Promise<boolean> {
    const { applicantName, applicantEmail, jobTitle, companyName, interviewDate, interviewTime, duration, type, meetingLink, action } = data;

    const subject = action === 'cancelled' 
      ? `Interview Cancelled - ${jobTitle}` 
      : `Interview Rescheduled - ${jobTitle}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${action === 'cancelled' ? '#ef4444' : '#f59e0b'}; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid ${action === 'cancelled' ? '#ef4444' : '#f59e0b'}; }
          .info-row { display: flex; padding: 10px 0; border-bottom: 1px solid #eee; }
          .info-label { font-weight: bold; width: 150px; color: ${action === 'cancelled' ? '#ef4444' : '#f59e0b'}; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${action === 'cancelled' ? '❌ Interview Cancelled' : '🔄 Interview Rescheduled'}</h1>
          </div>
          <div class="content">
            <p>Dear ${applicantName},</p>
            
            ${action === 'cancelled' ? `
              <p>We regret to inform you that the interview scheduled for the <strong>${jobTitle}</strong> position at <strong>${companyName}</strong> has been cancelled.</p>
              
              <p>We apologize for any inconvenience this may cause. Our team will be in touch with you soon regarding next steps.</p>
            ` : `
              <p>Your interview for the <strong>${jobTitle}</strong> position at <strong>${companyName}</strong> has been rescheduled.</p>
              
              <div class="info-box">
                <h3 style="margin-top: 0; color: #f59e0b;">📋 New Interview Details</h3>
                <div class="info-row">
                  <div class="info-label">📅 Date:</div>
                  <div>${interviewDate}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">🕐 Time:</div>
                  <div>${interviewTime}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">⏱️ Duration:</div>
                  <div>${duration} minutes</div>
                </div>
                <div class="info-row">
                  <div class="info-label">💼 Type:</div>
                  <div>${type} Interview</div>
                </div>
                ${meetingLink ? `
                  <div class="info-row" style="border-bottom: none;">
                    <div class="info-label">🔗 Meeting Link:</div>
                    <div><a href="${meetingLink}" style="color: #667eea;">${meetingLink}</a></div>
                  </div>
                ` : ''}
              </div>
              
              ${meetingLink ? `
                <center>
                  <a href="${meetingLink}" class="button">Join Interview</a>
                </center>
              ` : ''}
              
              <p>We apologize for any inconvenience. If you have any concerns about the new schedule, please contact us as soon as possible.</p>
            `}
            
            <p>You can view more details by logging into your HireSense dashboard.</p>
            
            <p>Best regards,<br>The ${companyName} Hiring Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message from HireSense AI.</p>
            <p>Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(applicantEmail, subject, html);
  }

  // Template: Polite Rejection Email (for bulk rejection)
  async sendRejectionEmail(data: {
    applicantName: string;
    applicantEmail: string;
    jobTitle: string;
    companyName: string;
  }): Promise<boolean> {
    const { applicantName, applicantEmail, jobTitle, companyName } = data;

    const subject = `Update on Your Application - ${jobTitle}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.8; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Thank You for Your Application</h1>
          </div>
          <div class="content">
            <p>Dear ${applicantName},</p>
            
            <p>Thank you for taking the time to apply for the <strong>${jobTitle}</strong> position at <strong>${companyName}</strong>. We truly appreciate your interest in joining our team.</p>
            
            <p>After careful consideration, we regret to inform you that we have decided to move forward with other candidates whose qualifications more closely match our current requirements for this particular role.</p>
            
            <p>Please know that this decision was not easy and does not reflect on your abilities or potential. The competition for this position was strong, and we received many impressive applications.</p>
            
            <p>We encourage you to:</p>
            <ul>
              <li>Keep an eye on our careers page for future opportunities that may be a better fit</li>
              <li>Continue developing your skills and experience</li>
              <li>Apply again for positions that match your background</li>
            </ul>
            
            <p>We wish you the very best in your job search and future career endeavors. Thank you once again for considering ${companyName} as a potential employer.</p>
            
            <p>Warm regards,<br>The ${companyName} Hiring Team</p>
          </div>
          <div class="footer">
            <p>This email was sent regarding your application at ${companyName}.</p>
            <p>We value your interest and time.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(applicantEmail, subject, html);
  }

  // Template: New Job Matching Skills
  async sendJobMatchNotification(data: {
    applicantName: string;
    applicantEmail: string;
    jobTitle: string;
    companyName: string;
    location: string;
    employmentType: string;
    experienceLevel: string;
    matchedSkills: string[];
    matchPercentage: number;
    jobId: string;
    salaryMin?: number;
    salaryMax?: number;
    applicationDeadline?: string;
    companyDescription?: string;
  }): Promise<boolean> {
    const { applicantName, applicantEmail, jobTitle, companyName, location, employmentType, experienceLevel, matchedSkills, matchPercentage, jobId, salaryMin, salaryMax, applicationDeadline, companyDescription } = data;

    // Format salary range if available
    const salaryInfo = salaryMin && salaryMax 
      ? `💰 $${salaryMin.toLocaleString()} - $${salaryMax.toLocaleString()}`
      : '';
    
    // Format application deadline if available
    const deadlineInfo = applicationDeadline 
      ? `<p style="color: #ef4444; font-weight: bold;">⏰ Application Deadline: ${applicationDeadline}</p>`
      : '';

    // Company description snippet (first 150 chars)
    const companyInfo = companyDescription 
      ? `<p style="color: #6b7280; font-size: 14px; margin-top: 10px;">${companyDescription.substring(0, 150)}${companyDescription.length > 150 ? '...' : ''}</p>`
      : '';

    const subject = `🎯 New Job Match: ${jobTitle} - ${matchPercentage}% Skill Match!`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.8; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .match-badge { display: inline-block; background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; font-size: 18px; }
          .job-card { background: white; border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px; margin: 20px 0; }
          .skill-tag { display: inline-block; background: #e0e7ff; color: #4f46e5; padding: 4px 12px; border-radius: 15px; font-size: 14px; margin: 4px 2px; }
          .job-details { background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 15px; font-size: 16px; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎯 Great News!</h1>
            <p>A new job matches your skills</p>
          </div>
          <div class="content">
            <p>Hi ${applicantName},</p>
            
            <p>We found a new job opportunity that matches <span class="match-badge">${matchPercentage}%</span> of your skills!</p>
            
            <div class="job-card">
              <h2 style="margin-top: 0; color: #1f2937;">${jobTitle}</h2>
              <p style="color: #374151; font-size: 16px; font-weight: 500; margin-bottom: 10px;">
                ${companyName}
              </p>
              ${companyInfo}
              
              <div class="job-details">
                <p style="margin: 8px 0;">📍 <strong>Location:</strong> ${location}</p>
                <p style="margin: 8px 0;">💼 <strong>Type:</strong> ${employmentType}</p>
                <p style="margin: 8px 0;">📊 <strong>Experience:</strong> ${experienceLevel.charAt(0).toUpperCase() + experienceLevel.slice(1)} Level</p>
                ${salaryInfo ? `<p style="margin: 8px 0;">${salaryInfo}</p>` : ''}
              </div>
              
              ${deadlineInfo}
              
              <p style="margin-top: 20px;"><strong>✅ Your Matching Skills:</strong></p>
              <div>
                ${matchedSkills.map(skill => `<span class="skill-tag">✓ ${skill}</span>`).join(' ')}
              </div>
            </div>
            
            <p style="font-size: 16px; color: #1f2937;">Don't miss this opportunity! Click below to view the full job description and apply directly.</p>
            
            <center>
              <a href="${process.env.FRONTEND_URL || 'http://localhost:8080'}/applicant/jobs/${jobId}" class="cta-button">
                Apply Now →
              </a>
            </center>
            
            <p style="margin-top: 25px; font-size: 14px; color: #6b7280;">This direct link will take you to the job application page where you can review all details and submit your application.</p>
            
            <p style="margin-top: 25px;">Best of luck with your application!</p>
            
            <p>Warm regards,<br>The HireSense AI Team</p>
          </div>
          <div class="footer">
            <p>You received this email because your skills match this job posting.</p>
            <p>Manage your notification preferences in your HireSense dashboard.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(applicantEmail, subject, html);
  }

  // Template: Interview Reminder
  async sendInterviewReminder(data: InterviewScheduledData): Promise<boolean> {
    const { applicantName, applicantEmail, jobTitle, companyName, interviewDate, interviewTime, duration, type, meetingLink, interviewId } = data;

    const subject = `⏰ Reminder: Your Interview Tomorrow - ${jobTitle}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #f59e0b; }
          .info-row { display: flex; padding: 10px 0; border-bottom: 1px solid #eee; }
          .info-label { font-weight: bold; width: 150px; color: #f59e0b; }
          .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
          .button-confirm { background: #10b981; }
          .urgent-box { background: #fef3c7; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #f59e0b; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Interview Reminder</h1>
            <p style="margin: 0;">Don't forget - your interview is coming up!</p>
          </div>
          <div class="content">
            <p>Dear ${applicantName},</p>
            
            <p>This is a friendly reminder about your upcoming interview for the <strong>${jobTitle}</strong> position at <strong>${companyName}</strong>.</p>
            
            <div class="urgent-box">
              <strong>⏰ Your interview is scheduled soon!</strong>
              <p style="margin: 5px 0 0 0;">Please confirm your attendance to let us know you'll be there.</p>
            </div>
            
            <div class="info-box">
              <h3 style="margin-top: 0; color: #f59e0b;">📋 Interview Details</h3>
              <div class="info-row">
                <div class="info-label">📅 Date:</div>
                <div>${interviewDate}</div>
              </div>
              <div class="info-row">
                <div class="info-label">🕐 Time:</div>
                <div>${interviewTime}</div>
              </div>
              <div class="info-row">
                <div class="info-label">⏱️ Duration:</div>
                <div>${duration} minutes</div>
              </div>
              <div class="info-row" style="border-bottom: none;">
                <div class="info-label">💼 Type:</div>
                <div>${type} Interview</div>
              </div>
            </div>
            
            <p><strong>🎯 Quick Checklist:</strong></p>
            <ul>
              <li>✅ Test your internet connection</li>
              <li>✅ Check your camera and microphone</li>
              <li>✅ Find a quiet space</li>
              <li>✅ Keep your resume ready</li>
              <li>✅ Join 5 minutes early</li>
            </ul>
            
            <center>
              ${meetingLink ? `<a href="${meetingLink}" class="button">🔗 Join Interview</a>` : ''}
              <a href="${process.env.FRONTEND_URL || 'http://localhost:8080'}/applicant?confirmInterview=${interviewId}" class="button button-confirm">✅ Confirm Attendance</a>
            </center>
            
            <p style="margin-top: 20px;">If you need to reschedule, please let us know as soon as possible.</p>
            
            <p>Best of luck! We look forward to speaking with you.</p>
            
            <p>Best regards,<br>The ${companyName} Hiring Team</p>
          </div>
          <div class="footer">
            <p>This is an automated reminder from HireSense AI.</p>
            <p>Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(applicantEmail, subject, html);
  }

  // 🔐 Template: Recruiter Email Verification
  async sendRecruiterVerification(data: RecruiterVerificationData): Promise<boolean> {
    const { recruiterName, companyEmail, companyName, verificationToken } = data;
    
    // Build verification link
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    const verificationLink = `${frontendUrl}/verify-email/${verificationToken}`;
    
    const subject = `Verify Your Company Email - HireSense AI`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
          .badge { background: #10b981; color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; display: inline-block; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
          .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .benefits { background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Verify Your Company Email</h1>
          </div>
          <div class="content">
            <p>Hi ${recruiterName},</p>
            
            <p>You're one step away from becoming a <span class="badge">✅ Verified Employer</span> on HireSense AI!</p>
            
            <p>Please verify your company email <strong>${companyEmail}</strong> for <strong>${companyName}</strong>.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationLink}" class="button" style="color: white;">
                ✅ Verify Email Address
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666;">Or copy and paste this link into your browser:</p>
            <p style="font-size: 12px; word-break: break-all; color: #667eea;">${verificationLink}</p>
            
            <div class="warning">
              <p style="margin: 0;"><strong>⏰ Link expires in 24 hours</strong></p>
              <p style="margin: 5px 0 0 0; font-size: 14px;">Didn't request this? You can safely ignore this email.</p>
            </div>
            
            <div class="benefits">
              <h3 style="margin: 0 0 10px 0; color: #059669;">✨ Benefits of Verification:</h3>
              <ul style="font-size: 14px; margin: 0; padding-left: 20px;">
                <li><strong>Verified Employer Badge</strong> - Shown on all your job postings</li>
                <li><strong>Higher Trust</strong> - Candidates prioritize verified companies</li>
                <li><strong>Unlimited Job Postings</strong> - No restrictions for verified accounts</li>
                <li><strong>Premium Features</strong> - Access to advanced hiring tools</li>
              </ul>
            </div>
            
            <p style="margin-top: 30px;">Best regards,<br><strong>HireSense AI Team</strong></p>
          </div>
          <div class="footer">
            <p>HireSense AI - Intelligent Hiring for Global Capability Centers</p>
            <p>This email was sent to ${companyEmail}</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    return this.sendEmail(companyEmail, subject, html);
  }

  // Template: Job Posted Confirmation (for Recruiter)
  async sendJobPostedConfirmation(data: {
    recruiterName: string;
    recruiterEmail: string;
    jobTitle: string;
    companyName: string;
    matchThreshold: number;
    notifiedCount: number;
    jobId: string;
    openings: number;
  }): Promise<boolean> {
    const { recruiterName, recruiterEmail, jobTitle, companyName, matchThreshold, notifiedCount, jobId, openings } = data;

    const subject = `✅ Job Posted Successfully - ${jobTitle}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.8; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .info-card { background: white; border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px; margin: 20px 0; }
          .stat-box { background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 10px 5px; font-weight: bold; font-size: 14px; }
          .button-secondary { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
          .next-steps { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Job Posted Successfully!</h1>
            <p>Your job is now live and visible to candidates</p>
          </div>
          <div class="content">
            <p>Hi ${recruiterName},</p>
            
            <p>Great news! Your job posting has been successfully published on HireSense.</p>
            
            <div class="info-card">
              <h2 style="margin-top: 0; color: #1f2937;">${jobTitle}</h2>
              <p style="color: #6b7280; margin-bottom: 15px;">
                <strong>${companyName}</strong>
              </p>
              <p style="color: #374151;">
                📅 <strong>Posted:</strong> ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}<br>
                🎯 <strong>Match Threshold:</strong> ${matchThreshold}%<br>
                👥 <strong>Openings:</strong> ${openings}
              </p>
            </div>
            
            <div class="stat-box">
              <h3 style="margin-top: 0; color: #059669;">📧 Notification Summary</h3>
              <p style="font-size: 18px; margin: 10px 0;">
                <strong>${notifiedCount}</strong> ${notifiedCount === 1 ? 'candidate has' : 'candidates have'} been automatically notified about this job posting.
              </p>
              <p style="font-size: 14px; color: #6b7280; margin-top: 10px;">
                These candidates have ${matchThreshold}% or higher skill match with your job requirements.
              </p>
            </div>
            
            <div class="next-steps">
              <h3 style="margin-top: 0; color: #1e40af;">🚀 Next Steps</h3>
              <ul style="margin: 10px 0; padding-left: 20px; line-height: 2;">
                <li>Applications will appear in your dashboard as candidates apply</li>
                <li>You'll receive email notifications for new applications</li>
                <li>Use AI-powered evaluation to screen candidates efficiently</li>
                <li>Schedule interviews directly through the platform</li>
              </ul>
            </div>
            
            <center style="margin-top: 30px;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:8080'}/recruiter/jobs/applications?jobId=${jobId}" class="button">
                📊 View Applications
              </a>
              <a href="${process.env.FRONTEND_URL || 'http://localhost:8080'}/recruiter/jobs" class="button button-secondary">
                📝 Manage Jobs
              </a>
            </center>
            
            <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
              <strong>Pro Tip:</strong> Enable AI insights to get instant candidate evaluations and recommendations!
            </p>
            
            <p style="margin-top: 25px;">Best regards,<br>The HireSense AI Team</p>
          </div>
          <div class="footer">
            <p>HireSense AI - Intelligent Hiring Platform</p>
            <p>This email was sent to ${recruiterEmail}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(recruiterEmail, subject, html);
  }

  // Helper: Format date for emails
  formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  // Helper: Format time for emails
  formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }
}

// Export singleton instance
export const emailService = new EmailService();
