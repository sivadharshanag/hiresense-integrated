import mongoose, { Document, Schema } from 'mongoose';

// Question category types
export type QuestionCategory = 'technical' | 'behavioral' | 'experience' | 'skills' | 'career' | 'problem_solving';

// Question difficulty levels
export type QuestionDifficulty = 'easy' | 'medium' | 'hard';

// Overall verdict types
export type InterviewVerdict = 'strong_hire' | 'hire' | 'maybe' | 'no_hire';

// Session status types
export type SessionStatus = 'in_progress' | 'completed' | 'abandoned';

// Interface for individual question evaluation
interface IQuestionEvaluation {
  technicalScore: number;
  communicationScore: number;
  confidenceScore: number;
  feedback: string;
}

// Interface for individual interview question
interface IInterviewQuestion {
  questionNumber: number;
  questionText: string;
  category: QuestionCategory;
  difficulty: QuestionDifficulty;
  relatedSkill?: string;
  answerText?: string;
  answerAudioUrl?: string;
  answerTranscriptTimestamps?: Array<{
    word: string;
    start: number;
    end: number;
  }>;
  evaluation?: IQuestionEvaluation;
  answeredAt?: Date;
  timeToAnswer?: number; // seconds taken to answer
}

// Interface for final AI readiness score
interface IFinalScore {
  aiReadinessScore: number; // 0-100
  technicalProficiency: number; // 0-100
  communicationSkills: number; // 0-100
  problemSolving: number; // 0-100
  cultureFit: number; // 0-100
  confidenceLevel: number; // 0-100
  overallVerdict: InterviewVerdict;
  detailedFeedback: string;
  strengths: string[];
  areasForImprovement: string[];
  recommendedResources?: string[];
}

// Main Interview Session interface
export interface IInterviewSession extends Document {
  userId: mongoose.Types.ObjectId;
  status: SessionStatus;
  startedAt: Date;
  completedAt?: Date;
  abandonedAt?: Date;
  
  // Resume snapshot at time of interview
  resumeSnapshot: string;
  
  // Job role context
  targetRole?: string;
  
  // Questions and answers
  questions: IInterviewQuestion[];
  totalQuestions: number;
  questionsAnswered: number;
  
  // Final evaluation
  finalScore?: IFinalScore;
  
  // Metadata
  durationSeconds?: number;
  averageResponseTime?: number;
  
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  addAnswer(
    questionNumber: number,
    answerText: string,
    answerAudioUrl?: string,
    timestamps?: Array<{ word: string; start: number; end: number }>
  ): void;
  
  addEvaluation(
    questionNumber: number,
    evaluation: IQuestionEvaluation
  ): void;
  
  complete(finalScore: IFinalScore): void;
  
  abandon(): void;
}

// Define static methods interface
export interface IInterviewSessionModel extends mongoose.Model<IInterviewSession> {
  findActiveSession(userId: mongoose.Types.ObjectId): Promise<IInterviewSession | null>;
  findUserSessions(userId: mongoose.Types.ObjectId, limit?: number): Promise<IInterviewSession[]>;
  getSessionStats(userId: mongoose.Types.ObjectId): Promise<{
    totalInterviews: number;
    averageScore: number;
    bestScore: number;
    improvementRate: number;
  }>;
}

// Question sub-schema
const QuestionEvaluationSchema = new Schema({
  technicalScore: { type: Number, min: 0, max: 10, required: true },
  communicationScore: { type: Number, min: 0, max: 10, required: true },
  confidenceScore: { type: Number, min: 0, max: 10, required: true },
  feedback: { type: String, required: true },
}, { _id: false });

const InterviewQuestionSchema = new Schema({
  questionNumber: { type: Number, required: true, min: 1 },
  questionText: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['technical', 'behavioral', 'experience', 'skills', 'career', 'problem_solving'],
    required: true 
  },
  difficulty: { 
    type: String, 
    enum: ['easy', 'medium', 'hard'],
    required: true 
  },
  relatedSkill: { type: String },
  answerText: { type: String },
  answerAudioUrl: { type: String },
  answerTranscriptTimestamps: [{
    word: { type: String, required: true },
    start: { type: Number, required: true },
    end: { type: Number, required: true },
  }],
  evaluation: QuestionEvaluationSchema,
  answeredAt: { type: Date },
  timeToAnswer: { type: Number },
}, { _id: false });

// Final score sub-schema
const FinalScoreSchema = new Schema({
  aiReadinessScore: { type: Number, min: 0, max: 100, required: true },
  technicalProficiency: { type: Number, min: 0, max: 100, required: true },
  communicationSkills: { type: Number, min: 0, max: 100, required: true },
  problemSolving: { type: Number, min: 0, max: 100, required: true },
  cultureFit: { type: Number, min: 0, max: 100, required: true },
  confidenceLevel: { type: Number, min: 0, max: 100, required: true },
  overallVerdict: { 
    type: String, 
    enum: ['strong_hire', 'hire', 'maybe', 'no_hire'],
    required: true 
  },
  detailedFeedback: { type: String, required: true },
  strengths: [{ type: String }],
  areasForImprovement: [{ type: String }],
  recommendedResources: [{ type: String }],
}, { _id: false });

// Main schema
const InterviewSessionSchema = new Schema<IInterviewSession>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'abandoned'],
    default: 'in_progress',
    required: true,
    index: true,
  },
  startedAt: {
    type: Date,
    default: Date.now,
    required: true,
  },
  completedAt: {
    type: Date,
  },
  abandonedAt: {
    type: Date,
  },
  resumeSnapshot: {
    type: String,
    required: true,
  },
  targetRole: {
    type: String,
  },
  questions: [InterviewQuestionSchema],
  totalQuestions: {
    type: Number,
    default: 10,
    required: true,
  },
  questionsAnswered: {
    type: Number,
    default: 0,
    required: true,
  },
  finalScore: FinalScoreSchema,
  durationSeconds: {
    type: Number,
  },
  averageResponseTime: {
    type: Number,
  },
}, {
  timestamps: true,
});

// Indexes for efficient queries
InterviewSessionSchema.index({ userId: 1, status: 1 });
InterviewSessionSchema.index({ userId: 1, createdAt: -1 });
InterviewSessionSchema.index({ status: 1, startedAt: -1 });

// Pre-save middleware to calculate duration and averages
InterviewSessionSchema.pre('save', function(next) {
  // Calculate questions answered
  this.questionsAnswered = this.questions.filter(q => q.answerText).length;
  
  // Calculate duration if completed
  if (this.status === 'completed' && this.completedAt && this.startedAt) {
    this.durationSeconds = Math.floor((this.completedAt.getTime() - this.startedAt.getTime()) / 1000);
  }
  
  // Calculate average response time
  const answeredQuestions = this.questions.filter(q => q.timeToAnswer);
  if (answeredQuestions.length > 0) {
    const totalTime = answeredQuestions.reduce((sum, q) => sum + (q.timeToAnswer || 0), 0);
    this.averageResponseTime = Math.floor(totalTime / answeredQuestions.length);
  }
  
  next();
});

// Instance methods
InterviewSessionSchema.methods.addAnswer = function(
  questionNumber: number,
  answerText: string,
  answerAudioUrl?: string,
  timestamps?: Array<{ word: string; start: number; end: number }>
) {
  const question = this.questions.find((q: IInterviewQuestion) => q.questionNumber === questionNumber);
  if (question) {
    question.answerText = answerText;
    question.answerAudioUrl = answerAudioUrl;
    question.answerTranscriptTimestamps = timestamps;
    question.answeredAt = new Date();
  }
};

InterviewSessionSchema.methods.addEvaluation = function(
  questionNumber: number,
  evaluation: IQuestionEvaluation
) {
  const question = this.questions.find((q: IInterviewQuestion) => q.questionNumber === questionNumber);
  if (question) {
    question.evaluation = evaluation;
  }
};

InterviewSessionSchema.methods.complete = function(finalScore: IFinalScore) {
  this.status = 'completed';
  this.completedAt = new Date();
  this.finalScore = finalScore;
};

InterviewSessionSchema.methods.abandon = function() {
  this.status = 'abandoned';
  this.abandonedAt = new Date();
};

// Static methods
InterviewSessionSchema.statics.findActiveSession = function(userId: mongoose.Types.ObjectId) {
  return this.findOne({ userId, status: 'in_progress' }).sort({ createdAt: -1 });
};

InterviewSessionSchema.statics.findUserSessions = function(
  userId: mongoose.Types.ObjectId,
  limit: number = 10
) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit);
};

InterviewSessionSchema.statics.getSessionStats = async function(userId: mongoose.Types.ObjectId) {
  const sessions = await this.find({ userId, status: 'completed' });
  
  if (sessions.length === 0) {
    return {
      totalInterviews: 0,
      averageScore: 0,
      bestScore: 0,
      improvementRate: 0,
    };
  }
  
  const scores = sessions
    .filter((s: IInterviewSession) => s.finalScore)
    .map((s: IInterviewSession) => s.finalScore!.aiReadinessScore);
  
  const averageScore = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
  const bestScore = Math.max(...scores);
  
  // Calculate improvement rate (comparing first and last 3 sessions)
  let improvementRate = 0;
  if (scores.length >= 6) {
    const firstThree = scores.slice(0, 3).reduce((a: number, b: number) => a + b, 0) / 3;
    const lastThree = scores.slice(-3).reduce((a: number, b: number) => a + b, 0) / 3;
    improvementRate = ((lastThree - firstThree) / firstThree) * 100;
  }
  
  return {
    totalInterviews: sessions.length,
    averageScore: Math.round(averageScore),
    bestScore: Math.round(bestScore),
    improvementRate: Math.round(improvementRate),
  };
};

export const InterviewSession = mongoose.model<IInterviewSession, IInterviewSessionModel>('InterviewSession', InterviewSessionSchema);
