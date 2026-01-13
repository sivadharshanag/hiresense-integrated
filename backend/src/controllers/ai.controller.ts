import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ApplicantProfile } from '../models/ApplicantProfile.model';
import { Application } from '../models/Application.model';
import { Job } from '../models/Job.model';
import { User } from '../models/User.model';
import { AppError } from '../middleware/errorHandler';
import githubService from '../services/github.service';
import { evaluateCandidateWithGemini } from '../services/gemini.service';
import { skillNormalizerService } from '../services/skill-normalizer.service';

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

// Calculate skill match score between job requirements and applicant skills
// Uses NLP-based skill normalization for accurate matching
// (e.g., "Node" matches "NodeJS", "node.js", "node js")
const calculateSkillMatch = (
  requiredSkills: string[],
  applicantSkills: string[]
): { score: number; matchedSkills: string[]; missingSkills: string[] } => {
  const result = skillNormalizerService.calculateSkillMatch(requiredSkills, applicantSkills);
  return {
    score: result.score,
    matchedSkills: result.matchedSkills,
    missingSkills: result.missingSkills,
  };
};

// Calculate experience score based on years of experience
const calculateExperienceScore = (
  experienceYears: number,
  jobLevel: string
): number => {
  const levelRequirements: Record<string, { min: number; ideal: number }> = {
    entry: { min: 0, ideal: 2 },
    mid: { min: 2, ideal: 5 },
    senior: { min: 5, ideal: 8 },
    lead: { min: 8, ideal: 12 },
  };

  const requirement = levelRequirements[jobLevel.toLowerCase()] || { min: 0, ideal: 5 };

  if (experienceYears < requirement.min) {
    return Math.round((experienceYears / requirement.min) * 50);
  } else if (experienceYears >= requirement.ideal) {
    return 100;
  } else {
    const range = requirement.ideal - requirement.min;
    const progress = experienceYears - requirement.min;
    return Math.round(50 + (progress / range) * 50);
  }
};

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

    const job = application.jobId as any;
    const user = application.applicantId as any;
    const applicant = await ApplicantProfile.findOne({
      userId: user._id,
    });

    // Prepare candidate data for Gemini (including projects)
    const candidateData = {
      applicantName: user.fullName || 'Unknown',
      applicantEmail: user.email || '',
      skills: applicant?.skills || [],
      experience: applicant?.experience || [],
      education: applicant?.education || [],
      projects: applicant?.projects || [],
      certifications: applicant?.certifications || [],
      yearsOfExperience: applicant?.yearsOfExperience || 0,
      githubUsername: applicant?.githubUsername,
      githubScore: applicant?.githubAnalysis?.score,
      githubTopLanguages: applicant?.githubAnalysis?.topLanguages,
      coverLetter: application.coverLetter,
    };

    // Prepare job data for Gemini
    const jobData = {
      title: job.title,
      description: job.description,
      department: job.department || 'General',
      requiredSkills: job.requiredSkills || [],
      experienceLevel: job.experienceLevel || 'mid',
      location: job.location || 'Remote',
      employmentType: job.employmentType || 'Full-time',
    };

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
    const applications = await Application.find({ jobId });

    let evaluated = 0;
    let failed = 0;

    // Evaluate each application
    for (const application of applications) {
      try {
        const applicant = await ApplicantProfile.findOne({
          userId: application.applicantId,
        });

        if (!applicant) continue;

        // Calculate scores (same logic as above)
        const skillMatch = calculateSkillMatch(
          job.requiredSkills || [],
          applicant.skills || []
        );

        const totalExperience = (applicant.experience || []).reduce((sum, exp) => {
          const start = new Date(exp.startDate);
          const end = exp.current ? new Date() : (exp.endDate ? new Date(exp.endDate) : new Date());
          const years = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
          return sum + years;
        }, 0);

        const experienceScore = calculateExperienceScore(
          totalExperience,
          job.experienceLevel
        );

        const githubScore = applicant.githubAnalysis?.score || 0;

        const overallScore = Math.round(
          skillMatch.score * 0.4 +
          experienceScore * 0.35 +
          githubScore * 0.25
        );

        const strengths: string[] = [];
        const gaps: string[] = [];

        if (skillMatch.score >= 80) strengths.push('Excellent skill match');
        if (experienceScore >= 80) strengths.push('Strong experience level');
        if (githubScore >= 70) strengths.push('Highly active GitHub profile');
        if (skillMatch.missingSkills.length > 0)
          gaps.push(`Missing: ${skillMatch.missingSkills.join(', ')}`);

        let recommendation: 'select' | 'review' | 'reject';
        if (overallScore >= 70) recommendation = 'select';
        else if (overallScore >= 50) recommendation = 'review';
        else recommendation = 'reject';

        application.aiInsights = {
          skillMatch: skillMatch.score,
          experienceScore,
          githubScore,
          educationScore: 0,
          overallScore,
          strengths,
          gaps,
          recommendation,
          confidence: overallScore,
        };

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
