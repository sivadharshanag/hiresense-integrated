import mongoose, { Document, Schema } from 'mongoose';

export interface IInterview extends Document {
  applicationId: mongoose.Types.ObjectId;
  scheduledTime: Date;
  duration: number; // in minutes
  meetingLink: string;
  type: 'Technical' | 'Behavioral' | 'HR' | 'Final';
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  notes?: string;
  // Drop-off detection fields
  candidateConfirmed: boolean;
  candidateConfirmedAt?: Date;
  candidateLastActionAt?: Date;
  reminderSentAt?: Date;
  reminderCount: number;
  dropOffRisk: 'low' | 'medium' | 'high';
  dropOffReasons: string[];
  createdAt: Date;
  updatedAt: Date;
}

const InterviewSchema = new Schema<IInterview>({
  applicationId: {
    type: Schema.Types.ObjectId,
    ref: 'Application',
    required: true
  },
  scheduledTime: {
    type: Date,
    required: true
  },
  duration: {
    type: Number,
    default: 60 // Default 60 minutes
  },
  meetingLink: {
    type: String,
    trim: true,
    default: ''
  },
  type: {
    type: String,
    enum: ['Technical', 'Behavioral', 'HR', 'Final'],
    default: 'Technical'
  },
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'cancelled', 'rescheduled'],
    default: 'scheduled'
  },
  notes: {
    type: String,
    default: ''
  },
  // Drop-off detection fields
  candidateConfirmed: {
    type: Boolean,
    default: false
  },
  candidateConfirmedAt: {
    type: Date
  },
  candidateLastActionAt: {
    type: Date,
    default: Date.now
  },
  reminderSentAt: {
    type: Date
  },
  reminderCount: {
    type: Number,
    default: 0
  },
  dropOffRisk: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  dropOffReasons: {
    type: [String],
    default: []
  }
}, {
  timestamps: true
});

// Index for efficient queries
InterviewSchema.index({ applicationId: 1 });
InterviewSchema.index({ scheduledTime: 1 });

export const Interview = mongoose.model<IInterview>('Interview', InterviewSchema);export default Interview;