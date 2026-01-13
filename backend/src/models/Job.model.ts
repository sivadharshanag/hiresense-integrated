import mongoose, { Document, Schema } from 'mongoose';

export interface IJob extends Document {
  recruiterId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  department: string;
  requiredSkills: string[];
  experienceLevel: 'fresher' | 'junior' | 'mid' | 'senior';
  jobCategory: 'software' | 'data-science' | 'qa-automation' | 'non-technical' | 'business';
  location: string;
  employmentType: 'Full-time' | 'Contract' | 'Part-time' | 'Internship';
  salaryMin?: number;
  salaryMax?: number;
  status: 'active' | 'closed' | 'draft';
  applicantCount: number;
  openings: number;
  hiredCount: number;
  applicationDeadline?: Date;
  // Company details (auto-filled from recruiter profile)
  company: string;
  companyDescription?: string;
  companyWebsite?: string;
  companyLocation?: string;
  createdAt: Date;
  updatedAt: Date;
}

const JobSchema = new Schema<IJob>({
  recruiterId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Job description is required']
  },
  department: {
    type: String,
    trim: true,
    default: 'Engineering'
  },
  requiredSkills: {
    type: [String],
    default: []
  },
  experienceLevel: {
    type: String,
    enum: ['fresher', 'junior', 'mid', 'senior'],
    required: true
  },
  jobCategory: {
    type: String,
    enum: ['software', 'data-science', 'qa-automation', 'non-technical', 'business'],
    default: 'software'
  },
  location: {
    type: String,
    trim: true,
    default: 'Remote'
  },
  employmentType: {
    type: String,
    enum: ['Full-time', 'Contract', 'Part-time', 'Internship'],
    default: 'Full-time'
  },
  salaryMin: {
    type: Number,
    min: 0
  },
  salaryMax: {
    type: Number,
    min: 0
  },
  status: {
    type: String,
    enum: ['active', 'closed', 'draft'],
    default: 'active'
  },
  applicantCount: {
    type: Number,
    default: 0
  },
  openings: {
    type: Number,
    default: 1,
    min: 1
  },
  hiredCount: {
    type: Number,
    default: 0
  },
  applicationDeadline: {
    type: Date,
    required: false
  },
  // Company details (auto-filled from recruiter profile)
  company: {
    type: String,
    trim: true,
    default: ''
  },
  companyDescription: {
    type: String,
    trim: true,
    default: ''
  },
  companyWebsite: {
    type: String,
    trim: true,
    default: ''
  },
  companyLocation: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true
});

// Index for efficient queries
JobSchema.index({ recruiterId: 1, status: 1 });
JobSchema.index({ status: 1, createdAt: -1 });

export const Job = mongoose.model<IJob>('Job', JobSchema);
