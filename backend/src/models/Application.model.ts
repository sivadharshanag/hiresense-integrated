import mongoose, { Document, Schema } from 'mongoose';

interface IRiskFactor {
  type: 'warning' | 'concern' | 'blocker';
  message: string;
  category: 'skills' | 'experience' | 'activity' | 'profile';
}

interface IScoringBreakdown {
  skillMatch: number;
  githubActivity: number;
  leetcodePerformance: number;
  experience: number;
  educationStrength: number;
  profileCompleteness: number;
  projectRelevance: number;
}

export interface IAIInsights {
  skillMatch: number;
  experienceScore: number;
  githubScore: number;
  leetcodeScore?: number;
  educationScore: number;
  overallScore: number;
  strengths: string[];
  gaps: string[];
  recommendation: 'select' | 'review' | 'reject';
  confidence: number;
  // New fields for enhanced AI evaluation
  confidenceLevel?: 'low' | 'medium' | 'high';
  confidenceScore?: number;
  riskFactors?: IRiskFactor[];
  scoringBreakdown?: IScoringBreakdown;
  // GCC Evaluation fields
  aiMatchScore?: number;
  hiringReadinessScore?: number;
  projectAlignmentScore?: number;
  riskFactorsList?: string[];
  projectAnalysis?: string;
  improvementSuggestions?: string[];
  aiSummary?: string;
  interviewQuestions?: string[];
}

interface IStatusHistory {
  status: 'pending' | 'under_review' | 'selected' | 'rejected' | 'reviewing' | 'shortlisted' | 'interview' | 'hired';
  timestamp: Date;
  note?: string;
  changedBy?: mongoose.Types.ObjectId;
}

export interface IRejectionFeedback {
  status: string;
  statusMessage: string;
  reasons: string[];
  improvementAreas: string[];
  learningFocus: string[];
  encouragement: string;
  generatedAt?: Date;
}

export interface IApplication extends Document {
  applicantId: mongoose.Types.ObjectId;
  jobId: mongoose.Types.ObjectId;
  coverLetter?: string;
  status: 'pending' | 'under_review' | 'selected' | 'rejected' | 'reviewing' | 'shortlisted' | 'interview' | 'hired';
  statusHistory: IStatusHistory[];
  aiInsights?: IAIInsights;
  rejectionFeedback?: IRejectionFeedback;
  appliedAt: Date;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ApplicationSchema = new Schema<IApplication>({
  applicantId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  jobId: {
    type: Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  coverLetter: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'under_review', 'selected', 'rejected', 'reviewing', 'shortlisted', 'interview', 'hired'],
    default: 'pending'
  },
  statusHistory: [{
    status: {
      type: String,
      enum: ['pending', 'under_review', 'selected', 'rejected', 'reviewing', 'shortlisted', 'interview', 'hired'],
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    note: String,
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  aiInsights: {
    // Core Scores
    skillMatch: { type: Number, default: 0 },
    experienceScore: { type: Number, default: 0 },
    githubScore: { type: Number, default: 0 },
    leetcodeScore: { type: Number, default: 0 },
    educationScore: { type: Number, default: 0 },
    overallScore: { type: Number, default: 0 },
    // GCC Evaluation Scores
    aiMatchScore: { type: Number, default: 0 },
    hiringReadinessScore: { type: Number, default: 0 },
    projectAlignmentScore: { type: Number, default: 0 },
    // Analysis Results
    strengths: [String],
    gaps: [String],
    riskFactorsList: [String],
    projectAnalysis: { type: String, default: '' },
    improvementSuggestions: [String],
    recommendation: {
      type: String,
      enum: ['select', 'review', 'reject'],
      default: 'review'
    },
    // AI Summary
    aiSummary: { type: String, default: '' },
    interviewQuestions: [String],
    // Confidence
    confidence: { type: Number, default: 0 },
    confidenceLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    confidenceScore: { type: Number, default: 0 },
    // Detailed Risk Factors
    riskFactors: [{
      type: {
        type: String,
        enum: ['warning', 'concern', 'blocker']
      },
      message: String,
      category: {
        type: String,
        enum: ['skills', 'experience', 'activity', 'profile']
      }
    }],
    // Scoring Breakdown
    scoringBreakdown: {
      skillMatch: { type: Number, default: 0 },
      githubActivity: { type: Number, default: 0 },
      leetcodePerformance: { type: Number, default: 0 },
      experience: { type: Number, default: 0 },
      educationStrength: { type: Number, default: 0 },
      profileCompleteness: { type: Number, default: 0 },
      projectRelevance: { type: Number, default: 0 }
    }
  },
  // Applicant-facing rejection feedback (auto-generated)
  rejectionFeedback: {
    status: { type: String, default: 'Not Selected' },
    statusMessage: { type: String, default: '' },
    reasons: [{ type: String }], // 2-3 high-level, non-judgmental reasons
    improvementAreas: [{ type: String }], // Personalized improvement suggestions
    learningFocus: [{ type: String }], // Learning path topics
    encouragement: { type: String, default: '' },
    generatedAt: { type: Date }
  },
  appliedAt: {
    type: Date,
    default: Date.now
  },
  reviewedAt: Date
}, {
  timestamps: true
});

// Compound index to prevent duplicate applications
ApplicationSchema.index({ applicantId: 1, jobId: 1 }, { unique: true });

// Index for efficient queries
ApplicationSchema.index({ jobId: 1, status: 1 });
ApplicationSchema.index({ applicantId: 1, status: 1 });

export const Application = mongoose.model<IApplication>('Application', ApplicationSchema);
