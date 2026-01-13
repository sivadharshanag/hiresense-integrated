import { GoogleGenerativeAI } from '@google/generative-ai';
import { scoringService } from './scoring.service';
import { skillNormalizerService } from './skill-normalizer.service';
import { IApplicantProfile } from '../models/ApplicantProfile.model';
import { IJob } from '../models/Job.model';
import { geminiClient } from '../utils/gemini-client';

// Note: genAI instance is now created dynamically via geminiClient

interface CandidateData {
  applicantName: string;
  applicantEmail: string;
  skills: string[];
  experience: Array<{
    company: string;
    role: string;
    startDate: Date;
    endDate?: Date;
    current: boolean;
    description?: string;
  }>;
  education: Array<{
    institution: string;
    degree: string;
    year: string;
  }>;
  projects?: Array<{
    name: string;
    description?: string;
    techStack?: string[];
    githubUrl?: string;
    liveUrl?: string;
  }>;
  certifications?: Array<{
    name: string;
    issuer?: string;
  }>;
  yearsOfExperience?: number;
  githubUsername?: string;
  githubScore?: number;
  githubTopLanguages?: string[];
  coverLetter?: string;
}

interface JobData {
  title: string;
  description: string;
  department: string;
  requiredSkills: string[];
  experienceLevel: string;
  jobCategory?: string; // software, data-science, qa-automation, non-technical, business
  location: string;
  employmentType: string;
}

interface AIEvaluationResult {
  overallScore: number;
  aiMatchScore: number;
  hiringReadinessScore: number;
  skillMatch: number;
  experienceScore: number;
  githubScore: number;
  educationScore: number;
  projectAlignmentScore: number;
  strengths: string[];
  gaps: string[];
  riskFactorsList: string[];
  recommendation: 'select' | 'review' | 'reject';
  confidence: number;
  aiSummary: string;
  projectAnalysis: string;
  interviewQuestions: string[];
  improvementSuggestions: string[];
  // Enhanced fields from scoring service
  confidenceLevel: 'low' | 'medium' | 'high';
  confidenceScore: number;
  riskFactors: Array<{
    type: 'warning' | 'concern' | 'blocker';
    message: string;
    category: 'skills' | 'experience' | 'activity' | 'profile';
  }>;
  scoringBreakdown: {
    skillMatch: number;
    githubActivity: number;
    experience: number;
    profileCompleteness: number;
    projectRelevance: number;
  };
}

export const evaluateCandidateWithGemini = async (
  candidate: CandidateData,
  job: JobData,
  profile?: IApplicantProfile,
  jobModel?: IJob
): Promise<AIEvaluationResult> => {
  // STEP 1: Always run fallback scoring first (resilience layer)
  let fallbackResult: any = null;
  if (profile && jobModel) {
    fallbackResult = scoringService.evaluateCandidate(jobModel, profile);
    console.log('✅ Fallback scoring complete:', {
      score: fallbackResult.overallScore,
      confidence: fallbackResult.confidenceLevel,
      risks: fallbackResult.riskFactors.length
    });
  }

  try {
    // STEP 2: Try Gemini AI for enhanced insights with automatic key rotation/fallback
    return await geminiClient.executeWithFallback(async (client) => {
      const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Calculate profile completeness for confidence assessment
    const hasResume = candidate.skills.length > 0 || candidate.experience.length > 0;
    const hasCompleteProfile = candidate.experience.length > 0 && candidate.education.length > 0;
    const hasExternalSignals = !!candidate.githubUsername && (candidate.githubScore || 0) > 0;
    const hasProjects = candidate.projects && candidate.projects.length > 0;
    
    // Calculate skill coverage percentage
    const candidateSkillsLower = candidate.skills.map(s => s.toLowerCase());
    const requiredSkillsLower = job.requiredSkills.map(s => s.toLowerCase());
    const matchedSkills = requiredSkillsLower.filter(reqSkill => 
      candidateSkillsLower.some(candSkill => 
        candSkill.includes(reqSkill) || reqSkill.includes(candSkill)
      )
    );
    const skillCoveragePercent = requiredSkillsLower.length > 0 
      ? Math.round((matchedSkills.length / requiredSkillsLower.length) * 100) 
      : 0;

    // Map experience level to years (updated for 4 levels)
    const expLevelYears: Record<string, number> = {
      'fresher': 0.5, 'entry': 1, 'junior': 2, 'mid': 4, 'senior': 6, 'lead': 7, 'principal': 10
    };
    const requiredYears = expLevelYears[job.experienceLevel.toLowerCase()] || 3;

    // Determine if this is a technical role (for GitHub relevance)
    const jobCategory = job.jobCategory || 'software';
    const isTechnicalRole = ['software', 'data-science', 'qa-automation'].includes(jobCategory);
    const githubRelevanceNote = isTechnicalRole 
      ? 'GitHub activity is RELEVANT for this technical role - consider it in evaluation.'
      : 'GitHub activity is NOT RELEVANT for this non-technical role - do not penalize for missing GitHub.';

    // Experience level expectations
    const levelExpectations: Record<string, string> = {
      'fresher': 'Entry-level role: Focus on learning potential, basic projects are acceptable, academic experience counts.',
      'junior': 'Junior role: Expect 1-3 years experience, personal/end-to-end projects, growing skill set.',
      'mid': 'Mid-level role: Expect 3-6 years experience, production/team projects, solid expertise.',
      'senior': 'Senior role: Expect 6+ years experience, scalable systems, leadership, architecture skills.'
    };
    const expectationNote = levelExpectations[job.experienceLevel] || levelExpectations['mid'];

    const prompt = `You are an AI hiring evaluation assistant for a Global Capability Center (GCC) using HireSense platform.

Your task is to evaluate a candidate for a SPECIFIC JOB ROLE and return a structured assessment.

## CONTEXT-AWARE EVALUATION (IMPORTANT!)
- **Job Category**: ${jobCategory} (${isTechnicalRole ? 'Technical' : 'Non-Technical'})
- **${githubRelevanceNote}**
- **Experience Level Expectations**: ${expectationNote}

Adjust your scoring expectations based on the experience level:
- Fresher: Basic projects OK, focus on potential
- Junior: Personal projects expected, some depth
- Mid: Production experience required
- Senior: Architecture/leadership expected

## IMPORTANT DEFINITIONS
- **AI Match Score** = How well the candidate matches the job requirements based on skills, experience, projects, and signals.
- **Hiring Readiness Score** = Overall hiring suitability combining AI Match Score, confidence, and risk factors.
- **Confidence Level** = How reliable the evaluation is for THIS job role (NOT personality confidence).

## CONFIDENCE CALCULATION RULES (MANDATORY)
Calculate confidence using ONLY these job-relative factors:

1. **Skill Coverage** (based on required job skills):
   - ≥ 80% required skills matched → +20 points
   - 60–79% matched → +10 points
   - < 60% matched → +0 points
   - Current skill coverage: ${skillCoveragePercent}% (${matchedSkills.length}/${requiredSkillsLower.length} skills)

2. **Experience Alignment** (job requires ${job.experienceLevel} level, ~${requiredYears}+ years):
   - Meets or exceeds requirement → +20 points
   - Slightly below requirement → +10 points
   - Far below requirement → +0 points

3. **Signal Reliability**:
   - Resume + complete profile + relevant external signals → +20 points
   - Resume + partial data → +10 points
   - Resume only → +0 points
   - Current signals: Resume=${hasResume}, CompleteProfile=${hasCompleteProfile}, GitHub=${hasExternalSignals}, Projects=${hasProjects}

4. **Risk Penalty**:
   - Deduct 10 points for EACH major risk factor identified

Final Confidence: Score ≥ 70 → "High" | 50–69 → "Medium" | < 50 → "Low"

## JOB CONTEXT
- **Title**: ${job.title}
- **Department**: ${job.department}
- **Required Skills**: ${job.requiredSkills.join(', ') || 'Not specified'}
- **Experience Level**: ${job.experienceLevel} (~${requiredYears}+ years)
- **Location**: ${job.location}
- **Employment Type**: ${job.employmentType}
- **Job Description**: ${job.description.substring(0, 500)}

## CANDIDATE DATA
- **Name**: ${candidate.applicantName}
- **Declared Years of Experience**: ${candidate.yearsOfExperience || 'Not specified'}
- **Skills**: ${candidate.skills.join(', ') || 'Not specified'}
- **Work Experience**: ${candidate.experience.length > 0 
    ? candidate.experience.map(exp => 
        `${exp.role} at ${exp.company} (${new Date(exp.startDate).getFullYear()} - ${exp.current ? 'Present' : exp.endDate ? new Date(exp.endDate).getFullYear() : 'N/A'})${exp.description ? ': ' + exp.description.substring(0, 150) : ''}`
      ).join(' | ')
    : 'No experience listed'}
- **Education**: ${candidate.education.length > 0
    ? candidate.education.map(edu => 
        `${edu.degree} from ${edu.institution} (${edu.year})`
      ).join(' | ')
    : 'No education listed'}
- **Projects**: ${candidate.projects && candidate.projects.length > 0
    ? candidate.projects.map(proj => 
        `${proj.name}${proj.techStack?.length ? ' [Tech: ' + proj.techStack.join(', ') + ']' : ''}${proj.description ? ' - ' + proj.description.substring(0, 100) : ''}`
      ).join(' | ')
    : 'No projects listed'}
- **Certifications**: ${candidate.certifications && candidate.certifications.length > 0
    ? candidate.certifications.map(cert => cert.name).join(', ')
    : 'None'}
- **GitHub Profile**: ${candidate.githubUsername || 'Not provided'}${candidate.githubScore ? ` (Activity Score: ${candidate.githubScore}/100)` : ''}
- **GitHub Top Languages**: ${candidate.githubTopLanguages?.join(', ') || 'N/A'}
- **Cover Letter Summary**: ${candidate.coverLetter ? candidate.coverLetter.substring(0, 200) : 'Not provided'}

## EVALUATION INSTRUCTIONS

1. **Skill Analysis**: 
   - Compare candidate skills against required skills using semantic matching (e.g., "Node" = "NodeJS" = "node.js")
   - Check if projects demonstrate practical application of required skills
   - Identify any critical missing skills

2. **Experience Analysis**:
   - Verify experience years align with job requirements
   - Check if work history is relevant to the role
   - Look for career progression and consistency

3. **Project Alignment**:
   - Evaluate if projects use similar tech stack as job requirements
   - Assess project complexity and relevance
   - Check for full-stack/end-to-end project experience if applicable

4. **Risk Assessment**:
   - Identify gaps between requirements and qualifications
   - Flag any inconsistencies in profile
   - Note missing critical skills or experience

5. **Recommendation Logic**:
   - aiMatchScore ≥ 75: recommend "select" (Strong Fit)
   - aiMatchScore 55-74: recommend "review" (Potential Fit - needs interview)
   - aiMatchScore < 55: recommend "reject" (Not a fit currently)

## OUTPUT FORMAT (STRICT JSON ONLY - NO MARKDOWN, NO CODE BLOCKS)

{
  "aiMatchScore": <number 0-100>,
  "hiringReadinessScore": <number 0-100>,
  "overallScore": <number 0-100 same as hiringReadinessScore>,
  "skillMatch": <number 0-100>,
  "experienceScore": <number 0-100>,
  "educationScore": <number 0-100>,
  "projectAlignmentScore": <number 0-100>,
  "confidenceLevel": "High" | "Medium" | "Low",
  "confidence": <number 0-100 internal calculation>,
  "riskFactors": ["risk 1", "risk 2"],
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "gaps": ["gap 1", "gap 2"],
  "recommendation": "select" | "review" | "reject",
  "aiSummary": "2-3 sentence professional assessment",
  "projectAnalysis": "Brief analysis of how candidate's projects align with job requirements",
  "interviewQuestions": ["targeted question 1", "targeted question 2", "targeted question 3"],
  "improvementSuggestions": ["suggestion for candidate 1", "suggestion 2"]
}

## RULES
- Confidence MUST be job-specific and calculated per the rules above
- Do NOT use subjective or biased language
- Be explainable and ethical in scoring
- Consider both demonstrated skills and growth potential
- Projects with relevant tech stack should boost skill confidence`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse JSON from response (handle potential markdown code blocks)
    let jsonText = text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/, '').replace(/```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/, '').replace(/```$/, '');
    }

    const evaluation = JSON.parse(jsonText.trim());

    // STEP 3: Blend AI insights with fallback scoring
    if (fallbackResult) {
      // Use weighted blend: 60% Gemini AI + 40% Fallback
      const blendedScore = Math.round(
        evaluation.overallScore * 0.6 + fallbackResult.overallScore * 0.4
      );

      // Map AI confidence level
      const aiConfidenceLevel = evaluation.confidenceLevel?.toLowerCase() || 
        (evaluation.confidence >= 70 ? 'high' : evaluation.confidence >= 50 ? 'medium' : 'low');

      console.log('🤖 AI + Fallback blend:', {
        aiMatchScore: evaluation.aiMatchScore,
        hiringReadiness: evaluation.hiringReadinessScore,
        fallbackScore: fallbackResult.overallScore,
        finalScore: blendedScore,
        confidenceLevel: aiConfidenceLevel
      });

      // Convert AI risk factors to system format
      const aiRiskFactors = (evaluation.riskFactors || []).map((risk: string) => ({
        type: 'concern' as const,
        message: risk,
        category: 'skills' as const
      }));

      return {
        overallScore: Math.min(100, Math.max(0, blendedScore)),
        aiMatchScore: Math.min(100, Math.max(0, evaluation.aiMatchScore || blendedScore)),
        hiringReadinessScore: Math.min(100, Math.max(0, evaluation.hiringReadinessScore || blendedScore)),
        skillMatch: Math.min(100, Math.max(0, evaluation.skillMatch || 50)),
        experienceScore: Math.min(100, Math.max(0, evaluation.experienceScore || 50)),
        githubScore: candidate.githubScore || 0,
        educationScore: Math.min(100, Math.max(0, evaluation.educationScore || 50)),
        projectAlignmentScore: Math.min(100, Math.max(0, evaluation.projectAlignmentScore || 50)),
        strengths: [...new Set([...evaluation.strengths, ...fallbackResult.strengths])].slice(0, 5),
        gaps: [...new Set([...evaluation.gaps, ...fallbackResult.gaps])].slice(0, 5),
        riskFactorsList: evaluation.riskFactors || [],
        recommendation: blendedScore >= 75 ? 'select' : blendedScore >= 55 ? 'review' : 'reject',
        confidence: Math.min(100, Math.max(0, evaluation.confidence || 70)),
        aiSummary: evaluation.aiSummary || 'AI analysis completed.',
        projectAnalysis: evaluation.projectAnalysis || '',
        interviewQuestions: evaluation.interviewQuestions || [],
        improvementSuggestions: evaluation.improvementSuggestions || [],
        // Enhanced fields - prefer AI confidence level when available
        confidenceLevel: aiConfidenceLevel as 'low' | 'medium' | 'high',
        confidenceScore: evaluation.confidence || fallbackResult.confidenceScore,
        riskFactors: [...aiRiskFactors, ...fallbackResult.riskFactors].slice(0, 5),
        scoringBreakdown: {
          ...fallbackResult.scoringBreakdown,
          projectRelevance: evaluation.projectAlignmentScore || fallbackResult.scoringBreakdown.projectRelevance || 0
        }
      };
    }

    // If no fallback, return AI-only result with defaults
    const aiOnlyConfidenceLevel = evaluation.confidenceLevel?.toLowerCase() || 
      (evaluation.confidence >= 70 ? 'high' : evaluation.confidence >= 50 ? 'medium' : 'low');
    
    const aiOnlyScore = evaluation.hiringReadinessScore || evaluation.overallScore || 50;
    
    return {
      overallScore: Math.min(100, Math.max(0, aiOnlyScore)),
      aiMatchScore: Math.min(100, Math.max(0, evaluation.aiMatchScore || aiOnlyScore)),
      hiringReadinessScore: Math.min(100, Math.max(0, evaluation.hiringReadinessScore || aiOnlyScore)),
      skillMatch: Math.min(100, Math.max(0, evaluation.skillMatch || 50)),
      experienceScore: Math.min(100, Math.max(0, evaluation.experienceScore || 50)),
      githubScore: candidate.githubScore || 0,
      educationScore: Math.min(100, Math.max(0, evaluation.educationScore || 50)),
      projectAlignmentScore: Math.min(100, Math.max(0, evaluation.projectAlignmentScore || 50)),
      strengths: evaluation.strengths || [],
      gaps: evaluation.gaps || [],
      riskFactorsList: evaluation.riskFactors || [],
      recommendation: ['select', 'review', 'reject'].includes(evaluation.recommendation) 
        ? evaluation.recommendation 
        : 'review',
      confidence: Math.min(100, Math.max(0, evaluation.confidence || 70)),
      aiSummary: evaluation.aiSummary || 'AI analysis completed.',
      projectAnalysis: evaluation.projectAnalysis || '',
      interviewQuestions: evaluation.interviewQuestions || [],
      improvementSuggestions: evaluation.improvementSuggestions || [],
      confidenceLevel: aiOnlyConfidenceLevel as 'low' | 'medium' | 'high',
      confidenceScore: evaluation.confidence || 50,
      riskFactors: (evaluation.riskFactors || []).map((risk: string) => ({
        type: 'concern' as const,
        message: risk,
        category: 'skills' as const
      })),
      scoringBreakdown: {
        skillMatch: evaluation.skillMatch || 0,
        githubActivity: candidate.githubScore || 0,
        experience: evaluation.experienceScore || 0,
        profileCompleteness: evaluation.educationScore || 0,
        projectRelevance: evaluation.projectAlignmentScore || 0
      }
    };
    }); // End executeWithFallback
  } catch (error: any) {
    console.error('❌ Gemini API Error:', error.message);
    
    // STEP 4: If Gemini fails, use fallback exclusively
    if (fallbackResult) {
      console.log('✅ Using fallback scoring exclusively (API failed)');
      return {
        overallScore: fallbackResult.overallScore,
        aiMatchScore: fallbackResult.overallScore,
        hiringReadinessScore: fallbackResult.overallScore,
        skillMatch: fallbackResult.scoringBreakdown.skillMatch,
        experienceScore: fallbackResult.scoringBreakdown.experience,
        githubScore: fallbackResult.scoringBreakdown.githubActivity,
        educationScore: fallbackResult.scoringBreakdown.profileCompleteness,
        projectAlignmentScore: fallbackResult.scoringBreakdown.projectRelevance || 0,
        strengths: fallbackResult.strengths,
        gaps: fallbackResult.gaps,
        riskFactorsList: fallbackResult.riskFactors.map((r: any) => r.message),
        recommendation: fallbackResult.recommendation,
        confidence: fallbackResult.confidenceScore,
        aiSummary: `Algorithmic evaluation: Candidate scores ${fallbackResult.overallScore}% with ${fallbackResult.confidenceLevel} confidence. ${fallbackResult.riskFactors.length > 0 ? 'Risk factors identified.' : ''}`,
        projectAnalysis: 'Project analysis unavailable - using algorithmic scoring.',
        interviewQuestions: generateFallbackQuestions(candidate, job),
        improvementSuggestions: fallbackResult.gaps.slice(0, 3),
        confidenceLevel: fallbackResult.confidenceLevel,
        confidenceScore: fallbackResult.confidenceScore,
        riskFactors: fallbackResult.riskFactors,
        scoringBreakdown: {
          ...fallbackResult.scoringBreakdown,
          projectRelevance: fallbackResult.scoringBreakdown.projectRelevance || 0
        }
      };
    }

    // Fallback to basic rule-based scoring
    return getFallbackEvaluation(candidate, job);
  }
};

// Generate fallback interview questions
const generateFallbackQuestions = (
  candidate: CandidateData,
  job: JobData
): string[] => {
  const questions: string[] = [];
  
  if (job.requiredSkills.length > 0) {
    questions.push(`Can you describe your experience with ${job.requiredSkills[0]}?`);
  }
  
  if (candidate.experience.length > 0) {
    questions.push(`Tell us about your role at ${candidate.experience[0].company}.`);
  } else {
    questions.push('What projects have you worked on recently?');
  }
  
  questions.push(`What interests you about ${job.title} position?`);
  
  return questions;
};

// Fallback evaluation when Gemini API fails
const getFallbackEvaluation = (
  candidate: CandidateData,
  job: JobData
): AIEvaluationResult => {
  // Calculate skill match using NLP-based normalizer for accurate matching
  // (e.g., "Node" matches "NodeJS", "node.js", "node js")
  const skillMatchResult = skillNormalizerService.calculateSkillMatch(
    job.requiredSkills,
    candidate.skills
  );
  const skillMatch = skillMatchResult.score;

  // Calculate experience score
  const totalYears = candidate.experience.reduce((sum, exp) => {
    const start = new Date(exp.startDate);
    const end = exp.current ? new Date() : (exp.endDate ? new Date(exp.endDate) : new Date());
    return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
  }, 0);

  const levelRequirements: Record<string, number> = {
    entry: 1, junior: 2, mid: 4, senior: 6, lead: 8, principal: 10
  };
  const requiredYears = levelRequirements[job.experienceLevel.toLowerCase()] || 3;
  const experienceScore = Math.min(100, Math.round((totalYears / requiredYears) * 100));

  // Education score
  const educationScore = candidate.education.length > 0 ? 70 : 40;

  // GitHub score
  const githubScore = candidate.githubScore || 0;

  // Overall score
  const overallScore = Math.round(
    skillMatch * 0.35 +
    experienceScore * 0.30 +
    githubScore * 0.20 +
    educationScore * 0.15
  );

  // Determine recommendation
  const recommendation = overallScore >= 70 ? 'select' : overallScore >= 50 ? 'review' : 'reject';

  // Generate strengths and gaps
  const strengths: string[] = [];
  const gaps: string[] = [];

  if (skillMatch >= 70) strengths.push('Strong skill alignment with role requirements');
  if (experienceScore >= 70) strengths.push(`Solid experience (${Math.round(totalYears)} years)`);
  if (githubScore >= 60) strengths.push('Active GitHub profile demonstrates coding activity');
  if (candidate.education.length > 0) strengths.push('Relevant educational background');

  if (skillMatch < 50) gaps.push('Missing some required technical skills');
  if (experienceScore < 50) gaps.push('Experience level below requirements');
  if (githubScore < 30) gaps.push('Limited or no GitHub activity visible');

  // Calculate project alignment
  const projectAlignmentScore = candidate.projects && candidate.projects.length > 0
    ? Math.min(100, candidate.projects.length * 20 + 30)
    : 0;

  // Determine confidence level based on data quality
  let confidencePoints = 0;
  if (skillMatch >= 80) confidencePoints += 20;
  else if (skillMatch >= 60) confidencePoints += 10;
  
  if (experienceScore >= 100) confidencePoints += 20;
  else if (experienceScore >= 70) confidencePoints += 10;
  
  if (candidate.skills.length > 0 && candidate.experience.length > 0 && candidate.education.length > 0) {
    confidencePoints += 20;
  } else if (candidate.skills.length > 0) {
    confidencePoints += 10;
  }
  
  if (githubScore > 0) confidencePoints += 10;
  if (candidate.projects && candidate.projects.length > 0) confidencePoints += 10;

  const confidenceLevel = confidencePoints >= 70 ? 'high' : confidencePoints >= 50 ? 'medium' : 'low';

  // Generate risk factors
  const riskFactorsList: string[] = [];
  if (skillMatch < 60) riskFactorsList.push('Skill coverage below 60% of requirements');
  if (experienceScore < 70) riskFactorsList.push('Experience may not meet role requirements');
  if (githubScore === 0) riskFactorsList.push('No GitHub activity to verify technical skills');
  if (!candidate.projects || candidate.projects.length === 0) riskFactorsList.push('No projects to demonstrate practical skills');

  return {
    overallScore,
    aiMatchScore: overallScore,
    hiringReadinessScore: overallScore,
    skillMatch,
    experienceScore,
    githubScore,
    educationScore,
    projectAlignmentScore,
    strengths: strengths.length > 0 ? strengths : ['Candidate shows potential'],
    gaps: gaps.length > 0 ? gaps : ['No significant gaps identified'],
    riskFactorsList,
    recommendation,
    confidence: confidencePoints,
    aiSummary: `Algorithmic evaluation: Candidate scores ${overallScore}% overall with ${skillMatch}% skill match. Confidence: ${confidenceLevel}.`,
    projectAnalysis: candidate.projects && candidate.projects.length > 0 
      ? `Candidate has ${candidate.projects.length} project(s) demonstrating practical experience.`
      : 'No projects available for analysis.',
    interviewQuestions: [
      `Tell us about your experience with ${job.requiredSkills[0] || 'the required technologies'}.`,
      'Describe a challenging project you worked on recently.',
      'Why are you interested in this role?'
    ],
    improvementSuggestions: gaps.slice(0, 3),
    confidenceLevel: confidenceLevel as 'low' | 'medium' | 'high',
    confidenceScore: confidencePoints,
    riskFactors: riskFactorsList.map(msg => ({
      type: 'concern' as const,
      message: msg,
      category: 'skills' as const
    })),
    scoringBreakdown: {
      skillMatch,
      githubActivity: githubScore,
      experience: experienceScore,
      profileCompleteness: educationScore,
      projectRelevance: projectAlignmentScore
    }
  };
};

export default {
  evaluateCandidateWithGemini,
};
