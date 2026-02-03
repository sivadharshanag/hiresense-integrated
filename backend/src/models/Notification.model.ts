import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'job_match' | 'application_update' | 'interview_scheduled' | 'system';
  title: string;
  message: string;
  data: {
    jobId?: mongoose.Types.ObjectId;
    applicationId?: mongoose.Types.ObjectId;
    matchPercentage?: number;
    matchedSkills?: string[];
  };
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['job_match', 'application_update', 'interview_scheduled', 'system'],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    data: {
      jobId: {
        type: Schema.Types.ObjectId,
        ref: 'Job',
      },
      applicationId: {
        type: Schema.Types.ObjectId,
        ref: 'Application',
      },
      matchPercentage: {
        type: Number,
        min: 0,
        max: 100,
      },
      matchedSkills: [{
        type: String,
      }],
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export default mongoose.model<INotification>('Notification', NotificationSchema);
