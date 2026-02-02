import mongoose, { Document, Schema } from 'mongoose';

interface ISmartTag {
  tag: string;
  confidence: number;
  category: 'skills' | 'leadership' | 'potential' | 'experience' | 'culture';
}

interface ISuggestedJob {
  jobId: mongoose.Types.ObjectId;
  matchScore: number;
  matchedSkills: string[];
  suggestedAt: Date;
}

export interface ITalentPool extends Document {
  recruiterId: mongoose.Types.ObjectId;
  applicantId: mongoose.Types.ObjectId;
  originalJobId: mongoose.Types.ObjectId;
  originalApplicationId: mongoose.Types.ObjectId;
  smartTags: ISmartTag[];
  suggestedJobs: ISuggestedJob[];
  status: 'active' | 'contacted' | 'hired' | 'archived';
  notes: string;
  addedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TalentPoolSchema = new Schema<ITalentPool>({
  recruiterId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  applicantId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  originalJobId: {
    type: Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  originalApplicationId: {
    type: Schema.Types.ObjectId,
    ref: 'Application',
    required: true
  },
  smartTags: [{
    tag: { type: String, required: true },
    confidence: { type: Number, required: true, min: 0, max: 100 },
    category: { 
      type: String, 
      enum: ['skills', 'leadership', 'potential', 'experience', 'culture'],
      required: true 
    }
  }],
  suggestedJobs: [{
    jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
    matchScore: { type: Number, required: true, min: 0, max: 100 },
    matchedSkills: [{ type: String }],
    suggestedAt: { type: Date, default: Date.now }
  }],
  status: {
    type: String,
    enum: ['active', 'contacted', 'hired', 'archived'],
    default: 'active'
  },
  notes: {
    type: String,
    default: ''
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
TalentPoolSchema.index({ recruiterId: 1, status: 1 });
TalentPoolSchema.index({ applicantId: 1 });
TalentPoolSchema.index({ 'smartTags.tag': 1 });
TalentPoolSchema.index({ 'suggestedJobs.matchScore': -1 });

export const TalentPool = mongoose.model<ITalentPool>('TalentPool', TalentPoolSchema);
