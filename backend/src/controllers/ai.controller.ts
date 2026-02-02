import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ApplicantProfile, IApplicantProfile } from '../models/ApplicantProfile.model';
import { Application } from '../models/Application.model';
import { Job, IJob } from '../models/Job.model';
import { User, IUser } from '../models/User.model';
import { AppError } from '../middleware/errorHandler';
import githubService from '../services/github.service';
import { CandidateData, JobData, buildEvaluationFromScoring, evaluateCandidateWithGemini } from '../services/gemini.service';
import { scoringService } from '../services/scoring.service';

// Analyze GitHub profile
export const analyzeGitHub = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { username } = req.body;

    if (!username) {
      throw new AppError('GitHub username is required', 400);
    }

    console.log(`🔍 Analyzing GitHub profile for: ${username}`);

    // Fetch and analyze GitHub profile
    const analysis = await githubService.analyzeGitHubProfile(username);

    console.log(`✅ GitHub analysis complete. Score: ${analysis.overallScore}/100`);

    // Update applicant profile with GitHub data
    if (req.user?.role === 'applicant') {
      await ApplicantProfile.findOneAndUpdate(
        { userId: req.user.id },
        {
          githubUsername: username,
          githubAnalysis: {
            score: analysis.overallScore,
            topLanguages: analysis.topLanguages.map(l => l.language),
            insights: analysis.insights,
            lastAnalyzed: new Date(),
            repoCount: analysis.profileData.publicRepos,
          },
        },
        { upsert: true }
      );
      console.log(`📝 Profile updated for user: ${req.user.id}`);
    }

    res.status(200).json({
      status: 'success',
      message: `GitHub profile analyzed successfully! Score: ${analysis.overallScore}/100`,
      data: { analysis },
    });
  } catch (error: any) {
    console.error('❌ GitHub analysis failed:', error.message);
    next(error);
  }
};

const buildCandidatePayload = (
  user: IUser,
  applicant?: IApplicantProfile | null,
  coverLetter?: string
): CandidateData => ({
  applicantName: user?.fullName || 'Unknown',
  applicantEmail: user?.email || '',
  skills: applicant?.skills ?? [],
  experience: applicant?.experience ?? [],
  education: applicant?.education ?? [],
  projects: applicant?.projects ?? [],
  certifications: applicant?.certifications ?? [],
  yearsOfExperience: applicant?.yearsOfExperience ?? 0,
  githubUsername: applicant?.githubUsername,
  githubScore: applicant?.githubAnalysis?.score,
  githubTopLanguages: applicant?.githubAnalysis?.topLanguages,
  leetcodeStats: applicant?.leetcodeStats,
  leetcodeScore: applicant?.leetcodeStats?.score,
  resumeText: applicant?.resumeText,
  coverLetter,
});

const buildJobPayload = (job: IJob): JobData => ({
  title: job.title,
  description: job.description,
  department: job.department || 'General',
  requiredSkills: job.requiredSkills || [],
  experienceLevel: job.experienceLevel || 'mid',
  jobCategory: job.jobCategory || 'software',
  location: job.location || 'Remote',
  employmentType: job.employmentType || 'Full-time',
});

// Evaluate application with AI insights (using Gemini)
export const evaluateApplication = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { applicationId } = req.params;

    // Get application with related data
    const application = await Application.findById(applicationId)
      .populate('jobId')
      .populate('applicantId');

    if (!application) {
      throw new AppError('Application not found', 404);
    }

    const job = application.jobId as unknown as IJob;
    const user = application.applicantId as unknown as IUser;
    const applicant = await ApplicantProfile.findOne({
      userId: user._id,
    });

    // Prepare candidate data for Gemini (including projects)
    const candidateData = buildCandidatePayload(user, applicant, application.coverLetter);

    // Prepare job data for Gemini
    const jobData = buildJobPayload(job);

    // Call Gemini AI for evaluation (with fallback scoring)
    console.log('🤖 Calling Gemini AI for candidate evaluation...');
    const aiEvaluation = await evaluateCandidateWithGemini(
      candidateData, 
      jobData,
      applicant || undefined,  // Pass ApplicantProfile for fallback scoring
      job                       // Pass Job model for fallback scoring
    );
    console.log('✅ Gemini evaluation complete:', aiEvaluation.overallScore);

    // Update application with AI insights (including GCC evaluation fields)
    application.aiInsights = {
      // Core Scores
      skillMatch: aiEvaluation.skillMatch,
      experienceScore: aiEvaluation.experienceScore,
      githubScore: aiEvaluation.githubScore,
      educationScore: aiEvaluation.educationScore,
      overallScore: aiEvaluation.overallScore,
      // GCC Evaluation Scores
      aiMatchScore: aiEvaluation.aiMatchScore,
      hiringReadinessScore: aiEvaluation.hiringReadinessScore,
      projectAlignmentScore: aiEvaluation.projectAlignmentScore,
      // Analysis Results
      strengths: aiEvaluation.strengths,
      gaps: aiEvaluation.gaps,
      riskFactorsList: aiEvaluation.riskFactorsList,
      projectAnalysis: aiEvaluation.projectAnalysis,
      improvementSuggestions: aiEvaluation.improvementSuggestions,
      recommendation: aiEvaluation.recommendation,
      // AI Summary
      aiSummary: aiEvaluation.aiSummary,
      interviewQuestions: aiEvaluation.interviewQuestions,
      // Confidence
      confidence: aiEvaluation.confidence,
      confidenceLevel: aiEvaluation.confidenceLevel,
      confidenceScore: aiEvaluation.confidenceScore,
      // Detailed Risk Factors
      riskFactors: aiEvaluation.riskFactors,
      scoringBreakdown: aiEvaluation.scoringBreakdown
    };

    await application.save();

    res.status(200).json({
      status: 'success',
      message: 'Application evaluated successfully with GCC AI Assessment',
      data: {
        aiInsights: application.aiInsights,
        aiSummary: aiEvaluation.aiSummary,
        projectAnalysis: aiEvaluation.projectAnalysis,
        interviewQuestions: aiEvaluation.interviewQuestions,
        improvementSuggestions: aiEvaluation.improvementSuggestions,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Batch evaluate all applications for a job
export const evaluateJobApplications = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { jobId } = req.params;

    // Verify job belongs to recruiter
    const job = await Job.findOne({ _id: jobId, recruiterId: req.user?.id });
    if (!job) {
      throw new AppError('Job not found or unauthorized', 404);
    }

    // Get all applications for this job
    const applications = await Application.find({ jobId }).populate('applicantId');
    const jobData = buildJobPayload(job);

    let evaluated = 0;
    let failed = 0;

    // Evaluate each application
    for (const application of applications) {
      try {
        const applicantUser = application.applicantId as unknown as IUser;
        if (!applicantUser) {
          failed++;
          continue;
        }

        const applicantProfile = await ApplicantProfile.findOne({
          userId: applicantUser._id,
        });

        if (!applicantProfile) {
          failed++;
          continue;
        }

        const candidatePayload = buildCandidatePayload(applicantUser, applicantProfile, application.coverLetter);
        const scoringResult = scoringService.evaluateCandidate(job, applicantProfile);
        const evaluation = buildEvaluationFromScoring(scoringResult, candidatePayload, jobData);

        application.aiInsights = {
          ...evaluation,
        } as any;

        await application.save();
        evaluated++;
      } catch (error) {
        failed++;
        console.error(`Failed to evaluate application ${application._id}:`, error);
      }
    }

    res.status(200).json({
      status: 'success',
      message: `Evaluated ${evaluated} applications`,
      data: {
        total: applications.length,
        evaluated,
        failed,
      },
    });
  } catch (error) {
    next(error);
  }
};
