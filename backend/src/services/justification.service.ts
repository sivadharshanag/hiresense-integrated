import { IApplication } from '../models/Application.model';

interface JustificationOptions {
  action: 'select' | 'reject' | 'review' | 'shortlist' | 'interview';
  application: IApplication;
  customReason?: string;
}

/**
 * Decision Justification Service
 * Automatically generates professional justification text for hiring decisions
 * Helps recruiters document their decisions with AI-backed reasoning
 */
class JustificationService {
  /**
   * Generate justification text based on action and application data
   */
  generateJustification(options: JustificationOptions): string {
    const { action, application, customReason } = options;
    const aiInsights = application.aiInsights;

    // If custom reason provided, use it as base
    if (customReason) {
      return customReason;
    }

    // If no AI insights, return basic template
    if (!aiInsights) {
      return this.getBasicTemplate(action);
    }

    switch (action) {
      case 'select':
        return this.generateSelectJustification(aiInsights);
      case 'reject':
        return this.generateRejectJustification(aiInsights);
      case 'shortlist':
        return this.generateShortlistJustification(aiInsights);
      case 'interview':
        return this.generateInterviewJustification(aiInsights);
      case 'review':
        return this.generateReviewJustification(aiInsights);
      default:
        return this.getBasicTemplate(action);
    }
  }

  /**
   * Generate justification for selecting a candidate
   */
  private generateSelectJustification(aiInsights: any): string {
    const parts: string[] = [];

    // Opening statement
    parts.push('Candidate selected based on comprehensive evaluation.');

    // Strengths
    if (aiInsights.strengths && aiInsights.strengths.length > 0) {
      const topStrengths = aiInsights.strengths.slice(0, 3);
      parts.push(`Key strengths: ${topStrengths.join(', ')}.`);
    }

    // Scores
    if (aiInsights.overallScore >= 70) {
      parts.push(`Strong overall score of ${aiInsights.overallScore}/100.`);
    }

    // GitHub activity
    if (aiInsights.githubScore && aiInsights.githubScore >= 60) {
      parts.push(`Active GitHub contributor (${aiInsights.githubScore}/100).`);
    }

    // Skill match
    if (aiInsights.skillMatch && aiInsights.skillMatch >= 70) {
      parts.push(`Excellent skill alignment (${aiInsights.skillMatch}% match).`);
    }

    // Confidence level
    if (aiInsights.confidenceLevel === 'high') {
      parts.push('High confidence in candidate fit.');
    }

    return parts.join(' ');
  }

  /**
   * Generate justification for rejecting a candidate
   */
  private generateRejectJustification(aiInsights: any): string {
    const parts: string[] = [];

    // Opening statement based on score
    if (aiInsights.overallScore < 50) {
      parts.push('Candidate does not meet minimum requirements for this position.');
    } else {
      parts.push('After careful evaluation, candidate profile does not align with current needs.');
    }

    // Risk factors
    if (aiInsights.riskFactors && aiInsights.riskFactors.length > 0) {
      const blockers = aiInsights.riskFactors.filter((r: any) => r.type === 'blocker');
      if (blockers.length > 0) {
        const reasons = blockers.map((r: any) => r.message).slice(0, 2);
        parts.push(`Critical gaps identified: ${reasons.join('; ')}.`);
      } else {
        const reasons = aiInsights.riskFactors.map((r: any) => r.message).slice(0, 2);
        parts.push(`Key concerns: ${reasons.join('; ')}.`);
      }
    }

    // Gaps
    if (aiInsights.gaps && aiInsights.gaps.length > 0) {
      const topGaps = aiInsights.gaps.slice(0, 2);
      parts.push(`Missing: ${topGaps.join(', ')}.`);
    }

    // Scores
    if (aiInsights.skillMatch && aiInsights.skillMatch < 50) {
      parts.push(`Limited skill match (${aiInsights.skillMatch}%).`);
    }

    // Recommendation
    parts.push('Recommend exploring other candidates with stronger alignment.');

    return parts.join(' ');
  }

  /**
   * Generate justification for shortlisting a candidate
   */
  private generateShortlistJustification(aiInsights: any): string {
    const parts: string[] = [];

    parts.push('Candidate shortlisted for further evaluation.');

    // Positive aspects
    if (aiInsights.strengths && aiInsights.strengths.length > 0) {
      const strength = aiInsights.strengths[0];
      parts.push(`Shows promise: ${strength}.`);
    }

    // Score
    if (aiInsights.overallScore >= 60) {
      parts.push(`Competitive score of ${aiInsights.overallScore}/100.`);
    }

    // Areas to explore
    if (aiInsights.gaps && aiInsights.gaps.length > 0) {
      const gap = aiInsights.gaps[0];
      parts.push(`Will clarify: ${gap}.`);
    }

    // Confidence
    if (aiInsights.confidenceLevel) {
      parts.push(`${aiInsights.confidenceLevel.charAt(0).toUpperCase() + aiInsights.confidenceLevel.slice(1)} confidence assessment.`);
    }

    return parts.join(' ');
  }

  /**
   * Generate justification for moving to interview stage
   */
  private generateInterviewJustification(aiInsights: any): string {
    const parts: string[] = [];

    parts.push('Candidate approved for interview stage.');

    // Strengths
    if (aiInsights.strengths && aiInsights.strengths.length > 0) {
      const strength = aiInsights.strengths[0];
      parts.push(`Notable strength: ${strength}.`);
    }

    // Areas to probe
    if (aiInsights.gaps && aiInsights.gaps.length > 0) {
      const topGaps = aiInsights.gaps.slice(0, 2);
      parts.push(`Interview focus: ${topGaps.join(', ')}.`);
    }

    // GitHub
    if (aiInsights.githubScore && aiInsights.githubScore >= 50) {
      parts.push('Code activity verified through GitHub.');
    }

    parts.push('Recommend technical assessment during interview.');

    return parts.join(' ');
  }

  /**
   * Generate justification for keeping under review
   */
  private generateReviewJustification(aiInsights: any): string {
    const parts: string[] = [];

    parts.push('Candidate requires additional review before decision.');

    // Reason for review
    if (aiInsights.confidenceLevel === 'low') {
      parts.push('Limited data available for comprehensive assessment.');
    } else if (aiInsights.overallScore >= 50 && aiInsights.overallScore < 70) {
      parts.push('Mixed indicators - some strengths with notable gaps.');
    }

    // What to review
    if (aiInsights.riskFactors && aiInsights.riskFactors.length > 0) {
      const concern = aiInsights.riskFactors[0];
      parts.push(`Need to verify: ${concern.message}.`);
    }

    parts.push('Pending further information or comparison with other candidates.');

    return parts.join(' ');
  }

  /**
   * Basic templates when AI insights not available
   */
  private getBasicTemplate(action: string): string {
    const templates: Record<string, string> = {
      select: 'Candidate selected based on profile review and qualifications.',
      reject: 'After review, candidate does not meet position requirements.',
      shortlist: 'Candidate shortlisted for further consideration.',
      interview: 'Candidate invited for interview to assess fit.',
      review: 'Application under review - pending additional evaluation.'
    };

    return templates[action] || 'Status updated.';
  }

  /**
   * Generate email-friendly version (shorter, more formal)
   */
  generateEmailNote(options: JustificationOptions): string {
    const fullJustification = this.generateJustification(options);
    
    // Trim to first 2 sentences for email
    const sentences = fullJustification.split('. ');
    return sentences.slice(0, 2).join('. ') + (sentences.length > 2 ? '.' : '');
  }
}

export const justificationService = new JustificationService();
