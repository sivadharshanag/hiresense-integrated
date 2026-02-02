import mongoose, { Document, Schema } from 'mongoose';

interface IExperience {
  company: string;
  role: string;
  startDate: Date;
  endDate?: Date;
  current: boolean;
  description: string;
}

interface IEducation {
  degree: string;
  institution: string;
  year: string;
}

interface IProject {
  name: string;
  description: string;
  techStack: string[];
  githubUrl?: string;
  liveUrl?: string;
}

interface IGitHubAnalysis {
  score: number;
  topLanguages: string[];
  insights: string[];
  lastAnalyzed: Date;
}

interface ILeetCodeStats {
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  ranking?: number;
  score: number;
  lastAnalyzed: Date;
}

interface ICertification {
  name: string;
  issuer: string;
  issueDate?: Date;
  expiryDate?: Date;
  credentialId?: string;
  credentialUrl?: string;
}

export interface IApplicantProfile extends Document {
  userId: mongoose.Types.ObjectId;
  resumeUrl: string;
  resumeFileName?: string;
  resumeText?: string; // Extracted text from resume
  skills: string[];
  preferredRoles: string[];
  experience: IExperience[];
  experienceText?: string; // Simple text version for display
  education: IEducation[];
  educationText?: string; // Simple text version for display
  yearsOfExperience?: number; // Total years of professional experience
  bio?: string; // Short professional summary
  location?: string; // City/Location
  linkedinUrl?: string; // LinkedIn profile URL
  portfolioUrl?: string; // Personal portfolio/website URL
  githubUsername: string;
  githubAnalysis?: IGitHubAnalysis;
  leetcodeUsername?: string;
  leetcodeStats?: ILeetCodeStats;
  projects: IProject[];
  certifications: ICertification[];
  profileComplete: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ApplicantProfileSchema = new Schema<IApplicantProfile>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  resumeUrl: {
    type: String,
    default: ''
  },
  resumeFileName: {
    type: String,
    default: ''
  },
  resumeText: {
    type: String,
    default: ''
  },
  skills: {
    type: [String],
    default: []
  },
  preferredRoles: {
    type: [String],
    default: []
  },
  experience: [{
    company: { type: String, required: true },
    role: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    current: { type: Boolean, default: false },
    description: { type: String, default: '' }
  }],
  experienceText: {
    type: String,
    default: ''
  },
  education: [{
    degree: { type: String, required: true },
    institution: { type: String, required: true },
    year: { type: String, required: true }
  }],
  educationText: {
    type: String,
    default: ''
  },
  yearsOfExperience: {
    type: Number,
    default: 0
  },
  bio: {
    type: String,
    trim: true,
    default: ''
  },
  location: {
    type: String,
    trim: true,
    default: ''
  },
  linkedinUrl: {
    type: String,
    trim: true,
    default: ''
  },
  portfolioUrl: {
    type: String,
    trim: true,
    default: ''
  },
  githubUsername: {
    type: String,
    trim: true,
    default: ''
  },
  githubAnalysis: {
    score: { type: Number },
    topLanguages: { type: [String] },
    insights: { type: [String] },
    lastAnalyzed: { type: Date },
    repoCount: { type: Number }
  },
  leetcodeUsername: {
    type: String,
    trim: true,
    default: ''
  },
  leetcodeStats: {
    totalSolved: { type: Number },
    easySolved: { type: Number },
    mediumSolved: { type: Number },
    hardSolved: { type: Number },
    ranking: { type: Number },
    score: { type: Number },
    lastAnalyzed: { type: Date }
  },
  projects: [{
    name: { type: String, required: true },
    description: { type: String, default: '' },
    techStack: { type: [String], default: [] },
    githubUrl: { type: String, default: '' },
    liveUrl: { type: String, default: '' }
  }],
  certifications: [{
    name: { type: String, required: true },
    issuer: { type: String, default: '' },
    issueDate: { type: Date },
    expiryDate: { type: Date },
    credentialId: { type: String, default: '' },
    credentialUrl: { type: String, default: '' }
  }],
  profileComplete: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Calculate profile completeness
ApplicantProfileSchema.pre('save', function(next) {
  const hasResume = !!this.resumeUrl;
  const hasSkills = this.skills.length > 0;
  const hasExperience = this.experience.length > 0;
  const hasEducation = this.education.length > 0;
  
  this.profileComplete = hasResume && hasSkills && hasExperience && hasEducation;
  next();
});

export const ApplicantProfile = mongoose.model<IApplicantProfile>('ApplicantProfile', ApplicantProfileSchema);
