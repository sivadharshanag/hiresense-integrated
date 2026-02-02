/**
 * Virtual Interview Service
 * 
 * Handles the complete virtual interview flow:
 * - Generates personalized questions based on resume
 * - Evaluates answers in real-time
 * - Generates final AI Readiness Score
 */

import { groqService } from './groq.service';
import { InterviewSession, IInterviewSession, QuestionCategory, QuestionDifficulty } from '../models/InterviewSession.model';
import { ApplicantProfile } from '../models/ApplicantProfile.model';
import mongoose from 'mongoose';

// Interface for generated question
export interface GeneratedQuestion {
  questionText: string;
  category: QuestionCategory;
  difficulty: QuestionDifficulty;
  relatedSkill?: string;
}

// Interface for answer evaluation
export interface AnswerEvaluation {
  technicalScore: number;
  communicationScore: number;
  confidenceScore: number;
  feedback: string;
}

// Interface for final evaluation
export interface FinalEvaluation {
  aiReadinessScore: number;
  technicalProficiency: number;
  communicationSkills: number;
  problemSolving: number;
  cultureFit: number;
  confidenceLevel: number;
  overallVerdict: 'strong_hire' | 'hire' | 'maybe' | 'no_hire';
  detailedFeedback: string;
  strengths: string[];
  areasForImprovement: string[];
  recommendedResources: string[];
}

class VirtualInterviewService {
  
  /**
   * Start a new interview session for a user
   */
  async startInterview(userId: mongoose.Types.ObjectId): Promise<IInterviewSession> {
    // Check if user already has an active session
    const activeSession = await InterviewSession.findActiveSession(userId);
    if (activeSession) {
      // Abandon the old session and create new one
      activeSession.abandon();
      await activeSession.save();
    }

    // Get user's profile and resume
    const profile = await ApplicantProfile.findOne({ userId });
    if (!profile) {
      throw new Error('User profile not found. Please complete your profile before starting an interview.');
    }

    // More lenient validation - allow interview if user has ANY profile data
    const hasAnyData = profile.resumeText || 
                       (profile.skills && profile.skills.length > 0) ||
                       (profile.experience && profile.experience.length > 0) ||
                       profile.bio ||
                       (profile.education && profile.education.length > 0);
    
    if (!hasAnyData) {
      throw new Error('Please add some information to your profile (skills, experience, or bio) before starting an interview.');
    }

    // Generate resume snapshot
    const resumeSnapshot = this.createResumeSnapshot(profile);

    // Generate 10 personalized questions
    const questions = await this.generateQuestions(resumeSnapshot, profile);

    // Create new session
    const session = new InterviewSession({
      userId,
      status: 'in_progress',
      resumeSnapshot,
      targetRole: profile.preferredRoles?.[0] || 'Software Engineer',
      questions: questions.map((q, index) => ({
        questionNumber: index + 1,
        questionText: q.questionText,
        category: q.category,
        difficulty: q.difficulty,
        relatedSkill: q.relatedSkill,
      })),
      totalQuestions: 10,
      questionsAnswered: 0,
    });

    await session.save();
    return session;
  }

  /**
   * Create a text snapshot of user's resume/profile for AI context
   */
  private createResumeSnapshot(profile: any): string {
    const parts: string[] = [];

    // Basic info
    parts.push(`TARGET ROLE: ${profile.preferredRoles?.join(', ') || 'General Software Role'}`);
    parts.push(`YEARS OF EXPERIENCE: ${profile.yearsOfExperience || 0}`);
    
    // Bio
    if (profile.bio) {
      parts.push(`\nBIO: ${profile.bio}`);
    }
    
    // Skills
    if (profile.skills?.length) {
      parts.push(`\nSKILLS: ${profile.skills.join(', ')}`);
    } else {
      parts.push(`\nSKILLS: General programming knowledge`);
    }

    // Experience
    if (profile.experience?.length) {
      parts.push('\nWORK EXPERIENCE:');
      profile.experience.forEach((exp: any) => {
        const endDate = exp.current ? 'Present' : (exp.endDate ? new Date(exp.endDate).getFullYear() : 'N/A');
        parts.push(`- ${exp.role || exp.title} at ${exp.company} (${new Date(exp.startDate).getFullYear()} - ${endDate})`);
        if (exp.description) {
          parts.push(`  ${exp.description}`);
        }
      });
    } else if (profile.experienceText) {
      parts.push('\nWORK EXPERIENCE:');
      parts.push(profile.experienceText);
    }

    // Projects
    if (profile.projects?.length) {
      parts.push('\nPROJECTS:');
      profile.projects.forEach((proj: any) => {
        parts.push(`- ${proj.name}`);
        if (proj.techStack?.length) {
          parts.push(`  Tech: ${proj.techStack.join(', ')}`);
        }
        if (proj.description) {
          parts.push(`  ${proj.description}`);
        }
      });
    }

    // Education
    if (profile.education?.length) {
      parts.push('\nEDUCATION:');
      profile.education.forEach((edu: any) => {
        parts.push(`- ${edu.degree} from ${edu.institution} (${edu.year || edu.graduationYear})`);
      });
    } else if (profile.educationText) {
      parts.push('\nEDUCATION:');
      parts.push(profile.educationText);
    }

    // GitHub
    if (profile.githubUsername) {
      parts.push(`\nGITHUB: ${profile.githubUsername}`);
    }

    // Resume text if available
    if (profile.resumeText) {
      parts.push('\nRESUME TEXT:');
      parts.push(profile.resumeText.slice(0, 2000)); // Limit to 2000 chars
    }

    return parts.join('\n');
  }

  /**
   * Generate 10 personalized interview questions based on resume
   */
  async generateQuestions(resumeSnapshot: string, profile: any): Promise<GeneratedQuestion[]> {
    const systemPrompt = `You are an expert technical interviewer generating personalized interview questions.`;

    const prompt = `Based on the candidate's resume below, generate exactly 10 interview questions that are:
1. Personalized to their specific experience and skills
2. Progressive in difficulty (start easier, get harder)
3. Cover these categories (2 questions each):
   - technical: Based on their tech stack and skills
   - experience: Deep dive into their work history
   - behavioral: Teamwork, leadership, conflict resolution
   - problem_solving: Hypothetical scenarios and challenges
   - career: Goals, motivations, and role fit

CANDIDATE RESUME:
${resumeSnapshot}

IMPORTANT RULES:
- Questions should be specific to their background (mention their projects/companies/skills)
- Start with easier warm-up questions, progress to more challenging ones
- Each question should assess different aspects
- Questions should feel natural and conversational
- For candidates with <2 years experience, focus on projects and learning
- For experienced candidates (3+ years), focus on architecture and leadership

RESPONSE FORMAT (JSON ONLY, NO MARKDOWN):
{
  "questions": [
    {
      "questionText": "Can you walk me through your experience with [specific skill from their resume]?",
      "category": "technical",
      "difficulty": "easy",
      "relatedSkill": "React"
    },
    ... (10 questions total)
  ]
}`;

    try {
      const result = await groqService.generateJSON<{ questions: GeneratedQuestion[] }>(prompt, systemPrompt);
      
      // Validate we got 10 questions
      if (!result.questions || result.questions.length !== 10) {
        console.warn('AI did not generate exactly 10 questions, using fallback');
        return this.generateFallbackQuestions(profile);
      }

      return result.questions;
    } catch (error) {
      console.error('Failed to generate questions with AI:', error);
      return this.generateFallbackQuestions(profile);
    }
  }

  /**
   * Fallback question generation if AI fails
   */
  private generateFallbackQuestions(profile: any): GeneratedQuestion[] {
    const skills = profile.skills || [];
    const experience = profile.experience || [];
    const projects = profile.projects || [];
    
    const primarySkill = skills[0] || 'your primary technology';
    const secondarySkill = skills[1] || 'your secondary technology';
    const company = experience[0]?.company || 'your previous company';
    const project = projects[0]?.name || 'one of your projects';

    return [
      {
        questionText: `Can you introduce yourself and tell me about your background?`,
        category: 'experience',
        difficulty: 'easy',
      },
      {
        questionText: `What motivated you to pursue a career in ${profile.preferredRoles?.[0] || 'this field'}?`,
        category: 'career',
        difficulty: 'easy',
      },
      {
        questionText: `Can you describe your experience with ${primarySkill}?`,
        category: 'technical',
        difficulty: 'easy',
        relatedSkill: primarySkill,
      },
      {
        questionText: `Tell me about ${project}. What was your role and what challenges did you face?`,
        category: 'experience',
        difficulty: 'medium',
      },
      {
        questionText: `How do you approach debugging a complex issue in production?`,
        category: 'technical',
        difficulty: 'medium',
      },
      {
        questionText: `Describe a time when you had to work with a difficult team member. How did you handle it?`,
        category: 'behavioral',
        difficulty: 'medium',
      },
      {
        questionText: `If you had to design a scalable system for ${secondarySkill}, how would you approach it?`,
        category: 'technical',
        difficulty: 'hard',
        relatedSkill: secondarySkill,
      },
      {
        questionText: `Tell me about a time when you failed or made a mistake. What did you learn from it?`,
        category: 'behavioral',
        difficulty: 'medium',
      },
      {
        questionText: `How do you stay updated with the latest technologies and industry trends?`,
        category: 'career',
        difficulty: 'easy',
      },
      {
        questionText: `Where do you see yourself in 3-5 years, and how does this role fit into your career goals?`,
        category: 'career',
        difficulty: 'medium',
      },
    ];
  }

  /**
   * Evaluate a single answer
   */
  async evaluateAnswer(
    sessionId: string,
    questionNumber: number,
    answer: string,
    questionText: string,
    resumeContext: string
  ): Promise<AnswerEvaluation> {
    const systemPrompt = `You are an expert technical interviewer evaluating candidate responses.`;

    const prompt = `Evaluate this interview answer briefly and constructively:

QUESTION: ${questionText}

CANDIDATE BACKGROUND (for context):
${resumeContext.substring(0, 1000)}

CANDIDATE'S ANSWER:
${answer}

Provide scores (1-10) and brief, actionable feedback:

1. **Technical Score (1-10)**: Does the answer demonstrate technical knowledge and accuracy?
   - Consider: Depth of knowledge, correct terminology, practical understanding
   
2. **Communication Score (1-10)**: Is the answer clear, structured, and well-articulated?
   - Consider: Clarity, structure (STAR method for behavioral), conciseness
   
3. **Confidence Score (1-10)**: Does the candidate sound confident and professional?
   - Consider: Decisiveness, avoiding excessive hedging, authentic examples

4. **Feedback (1-2 sentences)**: Constructive feedback highlighting what was good and one area to improve.

RESPONSE FORMAT (JSON ONLY, NO MARKDOWN):
{
  "technicalScore": 7,
  "communicationScore": 8,
  "confidenceScore": 7,
  "feedback": "Good technical explanation with clear examples. To improve, consider providing more specific metrics or outcomes from your experience."
}`;

    try {
      const result = await groqService.generateJSON<AnswerEvaluation>(prompt, systemPrompt);
      
      // Validate scores are in range
      result.technicalScore = Math.max(1, Math.min(10, result.technicalScore));
      result.communicationScore = Math.max(1, Math.min(10, result.communicationScore));
      result.confidenceScore = Math.max(1, Math.min(10, result.confidenceScore));
      
      return result;
    } catch (error) {
      console.error('Failed to evaluate answer with AI:', error);
      // Return neutral fallback evaluation
      return {
        technicalScore: 6,
        communicationScore: 6,
        confidenceScore: 6,
        feedback: 'Thank you for your answer. Your response has been recorded.',
      };
    }
  }

  /**
   * Generate final AI Readiness Score
   */
  async generateFinalEvaluation(session: IInterviewSession): Promise<FinalEvaluation> {
    // Calculate average scores from all evaluations
    const evaluatedQuestions = session.questions.filter(q => q.evaluation);
    
    if (evaluatedQuestions.length === 0) {
      throw new Error('No evaluated questions found in session');
    }

    const avgTechnical = this.average(evaluatedQuestions.map(q => q.evaluation!.technicalScore));
    const avgCommunication = this.average(evaluatedQuestions.map(q => q.evaluation!.communicationScore));
    const avgConfidence = this.average(evaluatedQuestions.map(q => q.evaluation!.confidenceScore));

    // Prepare interview transcript for AI analysis
    const transcript = session.questions
      .filter(q => q.answerText)
      .map(q => `Q${q.questionNumber}: ${q.questionText}\nA: ${q.answerText}\nScores: Tech=${q.evaluation?.technicalScore}/10, Comm=${q.evaluation?.communicationScore}/10, Conf=${q.evaluation?.confidenceScore}/10\nFeedback: ${q.evaluation?.feedback}`)
      .join('\n\n');

    const systemPrompt = `You are an expert hiring manager generating a comprehensive interview evaluation report.`;

    const prompt = `Generate a comprehensive AI Readiness Score for this completed interview:

CANDIDATE RESUME:
${session.resumeSnapshot.substring(0, 1500)}

TARGET ROLE: ${session.targetRole || 'Software Engineer'}

INTERVIEW TRANSCRIPT:
${transcript}

AVERAGE SCORES:
- Technical: ${avgTechnical.toFixed(1)}/10
- Communication: ${avgCommunication.toFixed(1)}/10
- Confidence: ${avgConfidence.toFixed(1)}/10

QUESTIONS ANSWERED: ${session.questionsAnswered}/${session.totalQuestions}

Provide a comprehensive evaluation with:

1. **Overall AI Readiness Score (0-100)**: Hiring readiness for tech roles
2. **Category Scores (0-100)**:
   - technicalProficiency: Technical knowledge and problem-solving
   - communicationSkills: Clarity, articulation, structure
   - problemSolving: Critical thinking and approach to challenges
   - cultureFit: Teamwork, adaptability, growth mindset
   - confidenceLevel: Professional presence and decisiveness

3. **Overall Verdict**:
   - "strong_hire": Exceptional candidate, highly recommended (score 80+)
   - "hire": Good candidate, recommended (score 65-79)
   - "maybe": Potential candidate, needs more assessment (score 50-64)
   - "no_hire": Not ready yet, needs improvement (score <50)

4. **Strengths**: Top 3-5 specific strengths demonstrated in answers
5. **Areas for Improvement**: Top 3-5 specific, actionable improvements
6. **Recommended Resources**: 3-5 specific courses, books, or practices to improve
7. **Detailed Feedback**: 3-4 paragraph comprehensive assessment

RESPONSE FORMAT (JSON ONLY, NO MARKDOWN):
{
  "aiReadinessScore": 75,
  "technicalProficiency": 72,
  "communicationSkills": 78,
  "problemSolving": 70,
  "cultureFit": 80,
  "confidenceLevel": 73,
  "overallVerdict": "hire",
  "detailedFeedback": "Comprehensive 3-4 paragraph assessment...",
  "strengths": ["Strong technical foundation in React", "Clear communication", ...],
  "areasForImprovement": ["Deepen system design knowledge", "Practice behavioral questions", ...],
  "recommendedResources": ["System Design Interview by Alex Xu", "LeetCode medium problems", ...]
}`;

    try {
      const result = await groqService.generateJSON<FinalEvaluation>(prompt, systemPrompt);
      
      // Validate scores
      result.aiReadinessScore = Math.max(0, Math.min(100, result.aiReadinessScore));
      result.technicalProficiency = Math.max(0, Math.min(100, result.technicalProficiency));
      result.communicationSkills = Math.max(0, Math.min(100, result.communicationSkills));
      result.problemSolving = Math.max(0, Math.min(100, result.problemSolving));
      result.cultureFit = Math.max(0, Math.min(100, result.cultureFit));
      result.confidenceLevel = Math.max(0, Math.min(100, result.confidenceLevel));
      
      return result;
    } catch (error) {
      console.error('Failed to generate final evaluation with AI:', error);
      // Return calculated fallback evaluation
      return this.calculateFallbackEvaluation(session, avgTechnical, avgCommunication, avgConfidence);
    }
  }

  /**
   * Calculate fallback evaluation if AI fails
   */
  private calculateFallbackEvaluation(
    session: IInterviewSession,
    avgTechnical: number,
    avgCommunication: number,
    avgConfidence: number
  ): FinalEvaluation {
    // Convert 1-10 scores to 0-100
    const technicalProficiency = avgTechnical * 10;
    const communicationSkills = avgCommunication * 10;
    const confidenceLevel = avgConfidence * 10;
    
    // Estimate other scores
    const problemSolving = (technicalProficiency + confidenceLevel) / 2;
    const cultureFit = (communicationSkills + confidenceLevel) / 2;
    
    // Overall score is weighted average
    const aiReadinessScore = Math.round(
      technicalProficiency * 0.35 +
      communicationSkills * 0.25 +
      problemSolving * 0.20 +
      cultureFit * 0.10 +
      confidenceLevel * 0.10
    );
    
    // Determine verdict
    let overallVerdict: 'strong_hire' | 'hire' | 'maybe' | 'no_hire';
    if (aiReadinessScore >= 80) overallVerdict = 'strong_hire';
    else if (aiReadinessScore >= 65) overallVerdict = 'hire';
    else if (aiReadinessScore >= 50) overallVerdict = 'maybe';
    else overallVerdict = 'no_hire';
    
    return {
      aiReadinessScore,
      technicalProficiency: Math.round(technicalProficiency),
      communicationSkills: Math.round(communicationSkills),
      problemSolving: Math.round(problemSolving),
      cultureFit: Math.round(cultureFit),
      confidenceLevel: Math.round(confidenceLevel),
      overallVerdict,
      detailedFeedback: `You completed ${session.questionsAnswered} out of ${session.totalQuestions} questions. Your overall performance shows ${aiReadinessScore >= 70 ? 'strong' : aiReadinessScore >= 50 ? 'good' : 'developing'} readiness for technical roles. Continue practicing and improving your skills.`,
      strengths: ['Completed the interview', 'Demonstrated engagement'],
      areasForImprovement: ['Continue practicing technical questions', 'Work on communication clarity'],
      recommendedResources: ['LeetCode for technical practice', 'System Design Interview book', 'Mock interview practice'],
    };
  }

  /**
   * Helper: Calculate average of numbers
   */
  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }

  /**
   * Get user's interview history
   */
  async getUserInterviewHistory(userId: mongoose.Types.ObjectId, limit: number = 5) {
    return await InterviewSession.findUserSessions(userId, limit);
  }

  /**
   * Get user's interview statistics
   */
  async getUserInterviewStats(userId: mongoose.Types.ObjectId) {
    return await InterviewSession.getSessionStats(userId);
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string, userId: mongoose.Types.ObjectId): Promise<IInterviewSession | null> {
    const session = await InterviewSession.findById(sessionId);
    
    if (!session) return null;
    
    // Verify ownership
    if (session.userId.toString() !== userId.toString()) {
      throw new Error('Unauthorized access to interview session');
    }
    
    return session;
  }

  /**
   * Save answer to session
   */
  async saveAnswer(
    sessionId: string,
    userId: mongoose.Types.ObjectId,
    questionNumber: number,
    answerText: string,
    answerAudioUrl?: string,
    timestamps?: Array<{ word: string; start: number; end: number }>
  ): Promise<IInterviewSession> {
    const session = await this.getSession(sessionId, userId);
    
    if (!session) {
      throw new Error('Interview session not found');
    }
    
    if (session.status !== 'in_progress') {
      throw new Error('Interview session is not active');
    }
    
    session.addAnswer(questionNumber, answerText, answerAudioUrl, timestamps);
    await session.save();
    
    return session;
  }

  /**
   * Save evaluation to session
   */
  async saveEvaluation(
    sessionId: string,
    userId: mongoose.Types.ObjectId,
    questionNumber: number,
    evaluation: AnswerEvaluation
  ): Promise<IInterviewSession> {
    const session = await this.getSession(sessionId, userId);
    
    if (!session) {
      throw new Error('Interview session not found');
    }
    
    session.addEvaluation(questionNumber, evaluation);
    await session.save();
    
    return session;
  }

  /**
   * Complete interview and save final score
   */
  async completeInterview(
    sessionId: string,
    userId: mongoose.Types.ObjectId,
    finalScore: FinalEvaluation
  ): Promise<IInterviewSession> {
    const session = await this.getSession(sessionId, userId);
    
    if (!session) {
      throw new Error('Interview session not found');
    }
    
    session.complete(finalScore);
    await session.save();
    
    return session;
  }
}

export const virtualInterviewService = new VirtualInterviewService();
export default virtualInterviewService;
