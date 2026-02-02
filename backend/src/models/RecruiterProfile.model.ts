import mongoose, { Document, Schema } from 'mongoose';

export type TrustLevel = 'low' | 'medium' | 'verified';

export interface IRecruiterProfile extends Document {
  userId: mongoose.Types.ObjectId;
  companyName: string;
  department: string;
  jobTitle: string;
  companyDescription: string;
  companyWebsite?: string;
  companyLocation?: string;
  
  // 🔐 VERIFICATION FIELDS
  companyEmail?: string;
  emailVerified: boolean;
  verificationToken?: string;
  verificationTokenExpires?: Date;
  verifiedAt?: Date;
  trustLevel: TrustLevel;
  
  profileComplete: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RecruiterProfileSchema = new Schema<IRecruiterProfile>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  companyName: {
    type: String,
    trim: true,
    default: ''
  },
  department: {
    type: String,
    trim: true,
    default: ''
  },
  jobTitle: {
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
  },
  
  // 🔐 VERIFICATION FIELDS
  companyEmail: {
    type: String,
    trim: true,
    lowercase: true,
    default: ''
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: {
    type: String,
    default: ''
  },
  verificationTokenExpires: {
    type: Date
  },
  verifiedAt: {
    type: Date
  },
  trustLevel: {
    type: String,
    enum: ['low', 'medium', 'verified'],
    default: 'low'
  },
  
  profileComplete: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Calculate profile completeness and trust level
RecruiterProfileSchema.pre('save', function(next) {
  const fieldsToCheck = [this.companyName, this.department, this.jobTitle];
  const filledFields = fieldsToCheck.filter(field => field && field.trim().length > 0);
  this.profileComplete = filledFields.length === fieldsToCheck.length;
  
  // 🔐 AUTO-CALCULATE TRUST LEVEL
  if (this.emailVerified) {
    this.trustLevel = 'verified';
  } else if (this.companyEmail) {
    const domain = this.companyEmail.split('@')[1]?.toLowerCase();
    const publicDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com', 'mail.com', 'protonmail.com'];
    
    if (domain && !publicDomains.includes(domain)) {
      this.trustLevel = 'medium';
    } else {
      this.trustLevel = 'low';
    }
  } else {
    this.trustLevel = 'low';
  }
  
  next();
});

export const RecruiterProfile = mongoose.model<IRecruiterProfile>('RecruiterProfile', RecruiterProfileSchema);
