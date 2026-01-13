import { IAIInsights } from '../models/Application.model';

interface InterviewQuestion {
  category: 'technical' | 'behavioral' | 'experience';
  question: string;
  whatToLookFor: string;
  priority: 'high' | 'medium' | 'low';
}

interface InterviewFocus {
  summary: string;
  questions: InterviewQuestion[];
  keyAreasToProbe: string[];
  redFlags: string[];
}

class InterviewService {
  /**
   * Generate focused interview questions based on candidate's gaps and strengths
   */
  generateInterviewFocus(
    aiInsights: IAIInsights,
    jobTitle: string,
    requiredSkills: string[]
  ): InterviewFocus {
    const questions: InterviewQuestion[] = [];
    const keyAreasToProbe: string[] = [];
    const redFlags: string[] = [];

    // Analyze gaps and generate technical questions
    if (aiInsights.gaps && aiInsights.gaps.length > 0) {
      const technicalQuestions = this.generateTechnicalQuestions(
        aiInsights.gaps,
        requiredSkills
      );
      questions.push(...technicalQuestions);

      // Add key areas to probe
      aiInsights.gaps.slice(0, 3).forEach((gap: string) => {
        keyAreasToProbe.push(`Assess practical experience with ${gap}`);
      });
    }

    // Generate behavioral questions based on risk factors
    if (aiInsights.riskFactors && aiInsights.riskFactors.length > 0) {
      const behavioralQuestions = this.generateBehavioralQuestions(
        aiInsights.riskFactors
      );
      questions.push(...behavioralQuestions);

      // Add red flags from blocker-level risks
      aiInsights.riskFactors
        .filter((risk: any) => risk.type === 'blocker')
        .forEach((risk: any) => {
          redFlags.push(risk.message);
        });
    }

    // Generate experience questions based on confidence level
    if (aiInsights.confidenceLevel === 'low' || aiInsights.confidenceLevel === 'medium') {
      const experienceQuestions = this.generateExperienceQuestions(
        aiInsights,
        jobTitle
      );
      questions.push(...experienceQuestions);
    }

    // Generate questions about strengths (to validate claims)
    if (aiInsights.strengths && aiInsights.strengths.length > 0) {
      const strengthQuestions = this.generateStrengthValidationQuestions(
        aiInsights.strengths
      );
      questions.push(...strengthQuestions.slice(0, 2)); // Limit to 2
    }

    // Sort questions by priority
    questions.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    const summary = this.generateSummary(aiInsights, questions.length);

    return {
      summary,
      questions: questions.slice(0, 7), // Limit to 7 questions
      keyAreasToProbe,
      redFlags,
    };
  }

  /**
   * Generate technical questions based on gaps
   */
  private generateTechnicalQuestions(
    gaps: string[],
    requiredSkills: string[]
  ): InterviewQuestion[] {
    const questions: InterviewQuestion[] = [];

    // Focus on top 3 gaps
    const topGaps = gaps.slice(0, 3);

    topGaps.forEach(gap => {
      // Check if gap is a required skill
      const isRequired = requiredSkills.some(skill =>
        skill.toLowerCase().includes(gap.toLowerCase()) ||
        gap.toLowerCase().includes(skill.toLowerCase())
      );

      questions.push({
        category: 'technical',
        question: `Can you describe a project where you worked extensively with ${gap}? What challenges did you face and how did you overcome them?`,
        whatToLookFor: `Listen for: Specific examples, problem-solving approach, depth of understanding, ability to articulate technical concepts. ${isRequired ? '⚠️ This is a REQUIRED skill - probe deeply.' : ''}`,
        priority: isRequired ? 'high' : 'medium',
      });
    });

    return questions;
  }

  /**
   * Generate behavioral questions based on risk factors
   */
  private generateBehavioralQuestions(
    riskFactors: Array<{ category: string; type: string; message: string }>
  ): InterviewQuestion[] {
    const questions: InterviewQuestion[] = [];

    // Activity-related risks
    const activityRisks = riskFactors.filter(r => r.category === 'activity');
    if (activityRisks.length > 0) {
      questions.push({
        category: 'behavioral',
        question: 'How do you stay current with new technologies and industry trends? Can you give examples from the past 6 months?',
        whatToLookFor: 'Assess learning agility, passion for technology, self-motivation. Look for concrete examples of continuous learning.',
        priority: activityRisks.some(r => r.type === 'blocker') ? 'high' : 'medium',
      });
    }

    // Experience-related risks
    const experienceRisks = riskFactors.filter(r => r.category === 'experience');
    if (experienceRisks.length > 0) {
      questions.push({
        category: 'experience',
        question: 'Tell me about a time when you had to quickly learn a new technology or framework to meet project deadlines. How did you approach it?',
        whatToLookFor: 'Gauge adaptability, learning speed, resourcefulness. This is crucial given limited experience.',
        priority: 'high',
      });
    }

    // Profile completeness risks
    const profileRisks = riskFactors.filter(r => r.category === 'profile');
    if (profileRisks.length > 0) {
      questions.push({
        category: 'behavioral',
        question: 'Walk me through your professional journey. What motivated your career choices and how did you develop your skills?',
        whatToLookFor: 'Clarify gaps in profile information, understand career trajectory, assess communication skills.',
        priority: 'medium',
      });
    }

    return questions;
  }

  /**
   * Generate experience-validation questions
   */
  private generateExperienceQuestions(
    aiInsights: IAIInsights,
    jobTitle: string
  ): InterviewQuestion[] {
    const questions: InterviewQuestion[] = [];

    if (aiInsights.experienceScore && aiInsights.experienceScore < 70) {
      questions.push({
        category: 'experience',
        question: `This ${jobTitle} role requires handling [specific responsibility]. Can you describe similar responsibilities you've handled in previous roles?`,
        whatToLookFor: 'Verify if limited experience is compensated by relevant project work or transferable skills. Look for specific examples.',
        priority: 'high',
      });
    }

    return questions;
  }

  /**
   * Generate questions to validate claimed strengths
   */
  private generateStrengthValidationQuestions(
    strengths: string[]
  ): InterviewQuestion[] {
    const questions: InterviewQuestion[] = [];

    // Pick the top strength
    if (strengths.length > 0) {
      const topStrength = strengths[0];
      questions.push({
        category: 'technical',
        question: `I see ${topStrength} is one of your strong areas. Can you walk me through a complex problem you solved using this skill?`,
        whatToLookFor: 'Validate the claimed strength through specific examples. Look for depth of knowledge and practical application.',
        priority: 'medium',
      });
    }

    return questions;
  }

  /**
   * Generate interview summary
   */
  private generateSummary(aiInsights: IAIInsights, questionCount: number): string {
    const confidence = aiInsights.confidenceLevel || 'medium';
    const gapCount = aiInsights.gaps?.length || 0;

    let summary = `Generated ${questionCount} focused interview questions based on candidate analysis. `;

    if (confidence === 'low') {
      summary += `⚠️ Low hiring confidence (${aiInsights.confidenceScore}%) - interview should thoroughly validate capabilities. `;
    } else if (confidence === 'medium') {
      summary += `Moderate hiring confidence (${aiInsights.confidenceScore}%) - interview should address identified gaps. `;
    } else {
      summary += `High hiring confidence (${aiInsights.confidenceScore}%) - interview should validate strengths and cultural fit. `;
    }

    if (gapCount > 0) {
      summary += `Focus on ${gapCount} skill gap${gapCount > 1 ? 's' : ''} identified during evaluation.`;
    }

    return summary;
  }
}

export default new InterviewService();
