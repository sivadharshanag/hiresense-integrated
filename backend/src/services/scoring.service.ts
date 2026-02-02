import { IApplicantProfile } from '../models/ApplicantProfile.model';
import { IJob } from '../models/Job.model';
import { InterviewSession } from '../models/InterviewSession.model';
import { skillNormalizerService } from './skill-normalizer.service';

export interface ScoringBreakdown {
  skillMatch: number;
  githubActivity: number;
  leetcodePerformance: number;
  experience: number;
  educationStrength: number;
  profileCompleteness: number;
  projectRelevance: number;
  aiReadiness: number;
}

export interface RiskFactor {
  type: 'warning' | 'concern' | 'blocker';
  message: string;
  category: 'skills' | 'experience' | 'activity' | 'profile';
}

export interface ScoringResult {
  overallScore: number;
  confidenceLevel: 'low' | 'medium' | 'high';
  confidenceScore: number;
  riskFactors: RiskFactor[];
  scoringBreakdown: ScoringBreakdown;
  strengths: string[];
  gaps: string[];
  recommendation: 'select' | 'review' | 'reject';
}

// Job category-based signal weights
// GitHub weight is 0 for non-technical roles
type CategoryWeights = {
  skills: number;
  github: number;
  leetcode: number;
  experience: number;
  projects: number;
  education: number;
  profile: number;
  aiReadiness: number;
};

const categoryWeights: Record<string, CategoryWeights> = {
  'software': { skills: 25, github: 15, leetcode: 10, experience: 15, projects: 15, education: 5, profile: 5, aiReadiness: 10 },
  'data-science': { skills: 25, github: 10, leetcode: 15, experience: 15, projects: 15, education: 5, profile: 5, aiReadiness: 10 },
  'qa-automation': { skills: 30, github: 10, leetcode: 10, experience: 15, projects: 15, education: 5, profile: 5, aiReadiness: 10 },
  'non-technical': { skills: 35, github: 0, leetcode: 0, experience: 25, projects: 0, education: 15, profile: 15, aiReadiness: 10 },
  'business': { skills: 30, github: 0, leetcode: 0, experience: 30, projects: 0, education: 15, profile: 15, aiReadiness: 10 }
};

const DEFAULT_AI_READINESS_SCORE = 50;


/**
 * Fallback Scoring Service
 * Provides resilient candidate evaluation without external API dependencies
 * Runs before AI evaluation to ensure we always have scores
 */
class ScoringService {
  /**
   * Calculate skill match between job requirements and candidate skills
   * Uses NLP-based skill normalization for accurate matching
   * (e.g., "Node" matches "NodeJS", "node.js", "node js")
   * Weight: 40% of total score
   */
  calculateSkillMatch(jobSkills: string[], candidateSkills: string[]): number {
    if (!jobSkills.length || !candidateSkills.length) return 0;

    // Use NLP-based skill normalizer for accurate matching
    const result = skillNormalizerService.calculateSkillMatch(jobSkills, candidateSkills);
    const matchPercentage = result.score;

    // Scoring logic
    if (matchPercentage >= 80) return 100;
    if (matchPercentage >= 60) return 85;
    if (matchPercentage >= 40) return 70;
    if (matchPercentage >= 20) return 50;
    return 30;
  }

  /**
   * Evaluate GitHub activity score
   * Weight: 25% of total score
   */
  calculateGitHubScore(githubAnalysis?: any): number {
    if (!githubAnalysis || !githubAnalysis.score) return 0;
    
    const score = githubAnalysis.score;
    
    // Normalize to 0-100 scale
    if (score >= 80) return 100;
    if (score >= 60) return 85;
    if (score >= 40) return 70;
    if (score >= 20) return 50;
    return 30;
  }

  /**
   * Calculate algorithmic problem-solving performance from LeetCode stats
   * Weight: Contextual based on job category
   */
  calculateLeetCodePerformance(leetcodeStats?: IApplicantProfile['leetcodeStats']): number {
    if (!leetcodeStats || typeof leetcodeStats.score !== 'number') return 0;

    const score = leetcodeStats.score;
    if (score >= 85) return 100;
    if (score >= 70) return 85;
    if (score >= 50) return 70;
    if (score >= 30) return 55;
    return 35;
  }

  /**
   * Evaluate the strength of formal education + certifications
   */
  calculateEducationStrength(education: IApplicantProfile['education'], certifications: IApplicantProfile['certifications']): number {
    if (!education?.length && !certifications?.length) {
      return 20;
    }

    let score = 40;
    const advancedDegree = education?.some(edu => /master|msc|mca|phd|doctor/i.test(edu.degree));
    const bachelors = education?.some(edu => /bachelor|bsc|btech|be/i.test(edu.degree));

    if (advancedDegree) score += 30;
    else if (bachelors) score += 20;

    const extraEducationEntries = Math.max(0, (education?.length || 0) - 1);
    score += Math.min(extraEducationEntries * 10, 20);

    if (certifications?.length) {
      score += Math.min(certifications.length * 5, 20);
    }

    return Math.min(100, score);
  }

  /**
   * Calculate experience match score
   * Supports 4 experience levels: fresher, junior, mid, senior
   * Weight: Varies by job category
   */
  calculateExperienceScore(
    jobExperienceLevel: string,
    candidateYears?: number,
    candidateExperience?: any[]
  ): number {
    // If no experience data, return 0
    if (!candidateYears && !candidateExperience?.length) return 0;

    const years = candidateYears || candidateExperience?.length || 0;

    // Map experience levels to years (updated for 4 levels)
    const levelMap: { [key: string]: { min: number; max: number } } = {
      fresher: { min: 0, max: 1 },   // 0-1 years
      junior: { min: 1, max: 3 },    // 1-3 years
      entry: { min: 0, max: 2 },     // Legacy support
      mid: { min: 3, max: 6 },       // 3-6 years
      senior: { min: 6, max: 100 },  // 6+ years
      lead: { min: 8, max: 100 }     // Legacy support
    };

    const required = levelMap[jobExperienceLevel] || levelMap.mid;

    // Perfect match
    if (years >= required.min && years <= required.max) return 100;

    // Slightly over-qualified
    if (years > required.max && years <= required.max + 3) return 90;

    // Under-qualified but close
    if (years < required.min && years >= required.min - 1) return 75;

    // Significantly over-qualified
    if (years > required.max + 3) return 70;

    // Significantly under-qualified
    if (years < required.min - 1) return 40;

    return 50;
  }

  /**
   * Calculate profile completeness score
   * Weight: 10% of total score
   */
  calculateProfileCompleteness(profile: IApplicantProfile): number {
    let score = 0;
    const checks = [
      { field: profile.skills.length > 0, weight: 20 },
      { field: profile.resumeText && profile.resumeText.length > 0, weight: 20 },
      { field: profile.experience.length > 0, weight: 15 },
      { field: profile.education.length > 0, weight: 15 },
      { field: !!profile.githubUsername, weight: 10 },
      { field: !!profile.linkedinUrl, weight: 5 },
      { field: !!(profile as any).portfolioUrl, weight: 5 },
      { field: (profile as any).projects?.length > 0, weight: 10 }
    ];

    checks.forEach(check => {
      if (check.field) score += check.weight;
    });

    return score;
  }

  /**
   * Calculate project relevance score
   * Weight: 15% of total score - matches candidate's projects to job requirements
   * Uses NLP-based skill normalization for accurate tech stack matching
   */
  calculateProjectRelevance(jobSkills: string[], projects: any[]): number {
    if (!projects || projects.length === 0 || !jobSkills.length) return 0;

    let totalRelevanceScore = 0;
    let relevantProjectCount = 0;

    projects.forEach(project => {
      const projectTechStack = project.techStack || [];
      
      // Use NLP-based skill normalizer for accurate matching
      const result = skillNormalizerService.calculateSkillMatch(jobSkills, projectTechStack);
      const matchingTech = result.matchedSkills.length;

      if (matchingTech > 0) {
        relevantProjectCount++;
        totalRelevanceScore += result.score;
      }
    });

    if (relevantProjectCount === 0) return 0;

    // Average relevance score with bonus for having multiple relevant projects
    const avgRelevance = totalRelevanceScore / relevantProjectCount;
    const projectCountBonus = Math.min(relevantProjectCount * 5, 20); // Max 20 bonus points

    return Math.min(Math.round(avgRelevance + projectCountBonus), 100);
  }

  /**
   * Calculate confidence level based on data quality
   */
  calculateConfidence(
    profile: IApplicantProfile,
    scoringBreakdown: ScoringBreakdown
  ): { level: 'low' | 'medium' | 'high'; score: number } {
    let confidenceScore = 0;

    // Data completeness (40%)
    const hasResume = !!profile.resumeText && profile.resumeText.length > 100;
    const hasSkills = profile.skills.length >= 3;
    const hasExperience = profile.experience.length > 0;
    const hasGithub = !!profile.githubAnalysis;

    if (hasResume) confidenceScore += 15;
    if (hasSkills) confidenceScore += 10;
    if (hasExperience) confidenceScore += 10;
    if (hasGithub) confidenceScore += 5;

    // Scoring consistency (30%)
    const scores = Object.values(scoringBreakdown).filter(s => s > 0);
    if (scores.length >= 3) confidenceScore += 20;
    else if (scores.length >= 2) confidenceScore += 10;

    // Score quality (30%)
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    if (avgScore >= 70) confidenceScore += 30;
    else if (avgScore >= 50) confidenceScore += 20;
    else confidenceScore += 10;

    // Determine confidence level
    let level: 'low' | 'medium' | 'high';
    if (confidenceScore >= 70) level = 'high';
    else if (confidenceScore >= 45) level = 'medium';
    else level = 'low';

    return { level, score: confidenceScore };
  }

  /**
   * Identify risk factors based on scores and profile data
   */
  identifyRiskFactors(
    scoringBreakdown: ScoringBreakdown,
    profile: IApplicantProfile,
    job: IJob
  ): RiskFactor[] {
    const risks: RiskFactor[] = [];
    const weights = categoryWeights[job.jobCategory] || categoryWeights['software'];

    // Skill-related risks
    if (scoringBreakdown.skillMatch < 50) {
      risks.push({
        type: 'blocker',
        message: 'Significant skill gap - missing critical required skills',
        category: 'skills'
      });
    } else if (scoringBreakdown.skillMatch < 70) {
      risks.push({
        type: 'warning',
        message: 'Moderate skill gap - some required skills missing',
        category: 'skills'
      });
    }

    // GitHub activity risks
    if (scoringBreakdown.githubActivity === 0) {
      risks.push({
        type: 'concern',
        message: 'No GitHub profile analyzed - unable to assess code activity',
        category: 'activity'
      });
    } else if (scoringBreakdown.githubActivity < 50) {
      risks.push({
        type: 'warning',
        message: 'Limited GitHub activity - inconsistent contribution history',
        category: 'activity'
      });
    }

    // DSA / LeetCode signals (only for technical roles)
    if (weights.leetcode > 0) {
      if (!profile.leetcodeStats) {
        risks.push({
          type: 'concern',
          message: 'No LeetCode stats available to verify problem-solving depth',
          category: 'activity'
        });
      } else if (scoringBreakdown.leetcodePerformance < 50) {
        risks.push({
          type: 'warning',
          message: 'Algorithmic problem-solving score below expectations for this role',
          category: 'activity'
        });
      }
    }

    // Experience-related risks
    if (scoringBreakdown.experience < 40) {
      risks.push({
        type: 'blocker',
        message: `Under-qualified for ${job.experienceLevel} level position`,
        category: 'experience'
      });
    } else if (scoringBreakdown.experience < 75) {
      risks.push({
        type: 'concern',
        message: 'Experience level slightly below job requirements',
        category: 'experience'
      });
    }

    // Profile completeness risks
    if (scoringBreakdown.profileCompleteness < 60) {
      risks.push({
        type: 'warning',
        message: 'Incomplete profile - missing key information',
        category: 'profile'
      });
    }

    if (weights.education > 0 && scoringBreakdown.educationStrength < 50) {
      risks.push({
        type: 'concern',
        message: 'Educational background details are insufficient for this role',
        category: 'profile'
      });
    }

    // Additional contextual risks
    if (!profile.resumeText || profile.resumeText.length < 100) {
      risks.push({
        type: 'concern',
        message: 'Resume not parsed or minimal content',
        category: 'profile'
      });
    }

    if (profile.experience.length === 0) {
      risks.push({
        type: 'warning',
        message: 'No work experience listed',
        category: 'experience'
      });
    }

    // Project-related risks
    const projects = (profile as any).projects || [];
    if (projects.length === 0) {
      risks.push({
        type: 'concern',
        message: 'No projects showcased - unable to assess practical experience',
        category: 'profile'
      });
    } else if (scoringBreakdown.projectRelevance < 30) {
      risks.push({
        type: 'warning',
        message: 'Projects use different tech stack than job requirements',
        category: 'skills'
      });
    }

    return risks;
  }

  /**
   * Identify candidate strengths
   */
  identifyStrengths(
    scoringBreakdown: ScoringBreakdown,
    profile: IApplicantProfile,
    job: IJob
  ): string[] {
    const strengths: string[] = [];

    if (scoringBreakdown.skillMatch >= 80) {
      strengths.push('Excellent skill match with job requirements');
    } else if (scoringBreakdown.skillMatch >= 60) {
      strengths.push('Strong skill alignment');
    }

    // Project-related strengths
    if (scoringBreakdown.projectRelevance >= 70) {
      strengths.push('Highly relevant project portfolio matching job requirements');
    } else if (scoringBreakdown.projectRelevance >= 50) {
      strengths.push('Projects demonstrate applicable skills');
    }

    const projects = (profile as any).projects || [];
    if (projects.length >= 3) {
      strengths.push(`${projects.length} projects showcased demonstrating hands-on experience`);
    }

    if (scoringBreakdown.githubActivity >= 70) {
      strengths.push('Active GitHub contributor with consistent activity');
    } else if (scoringBreakdown.githubActivity >= 50) {
      strengths.push('Moderate GitHub presence');
    }

    if (scoringBreakdown.leetcodePerformance >= 80) {
      strengths.push('Excellent problem-solving track record on LeetCode');
    } else if (scoringBreakdown.leetcodePerformance >= 60) {
      strengths.push('Solid DSA fundamentals demonstrated via coding challenges');
    }

    if (scoringBreakdown.experience >= 90) {
      strengths.push('Perfect experience match for role level');
    } else if (scoringBreakdown.experience >= 75) {
      strengths.push('Well-suited experience level');
    }

    if (scoringBreakdown.profileCompleteness >= 80) {
      strengths.push('Comprehensive professional profile');
    }

    if (scoringBreakdown.educationStrength >= 80) {
      strengths.push('Strong formal education and credentials');
    } else if (scoringBreakdown.educationStrength >= 60) {
      strengths.push('Well-documented academic foundation');
    }

    if (profile.githubAnalysis?.topLanguages?.length) {
      const languages = profile.githubAnalysis.topLanguages.slice(0, 3).join(', ');
      strengths.push(`Proficient in ${languages}`);
    }

    if (profile.education.length > 0) {
      strengths.push('Solid educational background');
    }

    return strengths;
  }

  /**
   * Main scoring function - calculates comprehensive candidate evaluation
   * Uses context-aware weights based on job category and experience level
   */
  async evaluateCandidate(
    job: IJob,
    profile: IApplicantProfile
  ): Promise<ScoringResult> {
    // Get job category (default to software if not set)
    const jobCategory = (job as any).jobCategory || 'software';
    const weights = categoryWeights[jobCategory] || categoryWeights['software'];

    // Calculate individual scores
    const skillMatch = this.calculateSkillMatch(job.requiredSkills, profile.skills);
    
    // Only calculate GitHub score if relevant for this job category
    const githubActivity = weights.github > 0 
      ? this.calculateGitHubScore(profile.githubAnalysis)
      : 0;

    const leetcodePerformance = weights.leetcode > 0
      ? this.calculateLeetCodePerformance(profile.leetcodeStats)
      : 0;
    
    const experience = this.calculateExperienceScore(
      job.experienceLevel,
      profile.yearsOfExperience,
      profile.experience
    );
    const profileCompleteness = this.calculateProfileCompleteness(profile);

    const educationStrength = this.calculateEducationStrength(profile.education, profile.certifications);
    
    // Only calculate project relevance if relevant for this job category
    const projectRelevance = weights.projects > 0
      ? this.calculateProjectRelevance(
          job.requiredSkills,
          (profile as any).projects || []
        )
      : 0;

    const aiReadiness = await this.getAiReadinessScore(profile.userId);

    const scoringBreakdown: ScoringBreakdown = {
      skillMatch,
      githubActivity,
      leetcodePerformance,
      experience,
      educationStrength,
      profileCompleteness,
      projectRelevance,
      aiReadiness
    };

    // Calculate weighted overall score using CONTEXT-AWARE weights
    // Weights adjust based on job category (e.g., GitHub=0 for non-technical roles)
    const overallScore = Math.round(
      skillMatch * (weights.skills / 100) +
      githubActivity * (weights.github / 100) +
      leetcodePerformance * (weights.leetcode / 100) +
      experience * (weights.experience / 100) +
      projectRelevance * (weights.projects / 100) +
      educationStrength * (weights.education / 100) +
      profileCompleteness * (weights.profile / 100) +
      aiReadiness * (weights.aiReadiness / 100)
    );

    // Calculate confidence
    const confidence = this.calculateConfidence(profile, scoringBreakdown);

    // Identify risks and strengths
    const riskFactors = this.identifyRiskFactors(scoringBreakdown, profile, job);
    const strengths = this.identifyStrengths(scoringBreakdown, profile, job);

    // Identify gaps
    const gaps: string[] = [];
    const matchedSkills = job.requiredSkills.filter(skill =>
      profile.skills.some(candidateSkill =>
        candidateSkill.toLowerCase().includes(skill.toLowerCase())
      )
    );
    const missingSkills = job.requiredSkills.filter(skill => !matchedSkills.includes(skill));
    if (missingSkills.length > 0) {
      gaps.push(...missingSkills.slice(0, 5).map(skill => `${skill} experience`));
    }

    if (weights.leetcode > 0) {
      if (!profile.leetcodeStats) {
        gaps.push('Add verifiable coding challenge stats (LeetCode, HackerRank, etc.)');
      } else if (scoringBreakdown.leetcodePerformance < 60) {
        gaps.push('Strengthen data structures & algorithms practice to improve LeetCode score');
      }
    }

    if (weights.education > 0 && scoringBreakdown.educationStrength < 60) {
      gaps.push('Document formal education and certifications in more detail');
    }

    // Determine recommendation
    let recommendation: 'select' | 'review' | 'reject';
    const blockers = riskFactors.filter(r => r.type === 'blocker').length;
    
    if (overallScore >= 75 && blockers === 0) {
      recommendation = 'select';
    } else if (overallScore >= 50 || blockers <= 1) {
      recommendation = 'review';
    } else {
      recommendation = 'reject';
    }

    return {
      overallScore,
      confidenceLevel: confidence.level,
      confidenceScore: confidence.score,
      riskFactors,
      scoringBreakdown,
      strengths,
      gaps,
      recommendation
    };
  }

  private async getAiReadinessScore(userId: IApplicantProfile['userId']): Promise<number> {
    if (!userId) return DEFAULT_AI_READINESS_SCORE;

    const latestSession = await InterviewSession.findOne({
      userId,
      status: 'completed',
      finalScore: { $exists: true }
    }).sort({ completedAt: -1, updatedAt: -1 });

    const score = latestSession?.finalScore?.aiReadinessScore;
    if (typeof score === 'number') {
      return Math.max(0, Math.min(100, score));
    }

    return DEFAULT_AI_READINESS_SCORE;
  }
}

export const scoringService = new ScoringService();
