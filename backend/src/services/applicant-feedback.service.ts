import { GoogleGenerativeAI } from '@google/generative-ai';
import { geminiClient } from '../utils/gemini-client';

export interface ApplicantFeedbackInput {
  jobTitle: string;
  requiredSkills: string[];
  candidateSkills: string[];
  experienceRequired?: string;
  candidateExperience?: string;
  aiInsights?: {
    gaps?: string[];
    strengths?: string[];
    recommendation?: string;
    skillMatch?: number;
    experienceScore?: number;
  };
}

export interface ApplicantFeedback {
  status: string;
  statusMessage: string;
  reasons: string[];
  improvementAreas: string[];
  learningFocus: string[];
  encouragement: string;
  generatedAt: Date;
}

/**
 * Generate supportive, applicant-facing rejection feedback
 * This is safe, non-judgmental, and focused on growth
 */
export const generateApplicantFeedback = async (
  input: ApplicantFeedbackInput
): Promise<ApplicantFeedback> => {
  try {
    return await geminiClient.executeWithFallback(async (client) => {
      const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `Generate rejection feedback for a job applicant.

CONTEXT:
- Job Title: ${input.jobTitle}
- Required Skills: ${input.requiredSkills.join(', ') || 'Not specified'}
- Candidate Skills: ${input.candidateSkills.join(', ') || 'Not provided'}
${input.experienceRequired ? `- Experience Required: ${input.experienceRequired}` : ''}
${input.candidateExperience ? `- Candidate Experience: ${input.candidateExperience}` : ''}
${input.aiInsights?.gaps ? `- Skill Gaps Identified: ${input.aiInsights.gaps.join(', ')}` : ''}
${input.aiInsights?.strengths ? `- Strengths: ${input.aiInsights.strengths.join(', ')}` : ''}

RULES:
- Be respectful and supportive
- Do NOT mention scores, rankings, or percentages
- Do NOT use negative or judgmental language like "failed", "not good enough", "weak"
- Focus on role-specific gaps and improvement areas
- Use neutral, encouraging phrases
- Limit to 2-3 reasons and 3 learning suggestions
- Frame everything as opportunities for growth

OUTPUT FORMAT (respond with ONLY valid JSON, no markdown):
{
  "statusMessage": "A brief, neutral explanation of the decision (1-2 sentences)",
  "reasons": ["Reason 1 - neutral, role-focused", "Reason 2 - neutral, role-focused"],
  "improvementAreas": ["Specific actionable suggestion 1", "Specific actionable suggestion 2", "Specific actionable suggestion 3"],
  "learningFocus": ["Learning topic 1", "Learning topic 2", "Learning topic 3"],
  "encouragement": "A brief, genuine encouraging message"
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text().trim();

    // Parse JSON - remove markdown if present
    if (text.startsWith('```json')) {
      text = text.replace(/```json\n?/, '').replace(/```$/, '');
    } else if (text.startsWith('```')) {
      text = text.replace(/```\n?/, '').replace(/```$/, '');
    }

    const parsed = JSON.parse(text.trim());

    return {
      status: 'Not Selected',
      statusMessage: parsed.statusMessage || getDefaultStatusMessage(input),
      reasons: parsed.reasons?.slice(0, 3) || getDefaultReasons(input),
      improvementAreas: parsed.improvementAreas?.slice(0, 3) || getDefaultImprovements(input),
      learningFocus: parsed.learningFocus?.slice(0, 3) || getDefaultLearningFocus(input),
      encouragement: parsed.encouragement || 'This feedback is provided to help you prepare for future opportunities. Keep learning and growing!',
      generatedAt: new Date()
    };
    }); // End executeWithFallback
  } catch (error) {
    console.error('Error generating applicant feedback:', error);
    // Return fallback feedback
    return {
      status: 'Not Selected',
      statusMessage: getDefaultStatusMessage(input),
      reasons: getDefaultReasons(input),
      improvementAreas: getDefaultImprovements(input),
      learningFocus: getDefaultLearningFocus(input),
      encouragement: 'This feedback is provided to help you prepare for future opportunities. Keep learning and growing!',
      generatedAt: new Date()
    };
  }
};

/**
 * Default status message
 */
const getDefaultStatusMessage = (input: ApplicantFeedbackInput): string => {
  return `This decision was based on role-specific requirements for the ${input.jobTitle} position and high competition. Below are areas that could strengthen your profile for similar roles.`;
};

/**
 * Default neutral reasons based on input
 */
const getDefaultReasons = (input: ApplicantFeedbackInput): string[] => {
  const reasons: string[] = [];
  
  // Check for skill gaps
  if (input.aiInsights?.gaps && input.aiInsights.gaps.length > 0) {
    reasons.push('Some technical skills for this specific role were not fully demonstrated');
  } else if (input.requiredSkills.length > 0) {
    reasons.push('Experience with certain required technologies was limited');
  }
  
  // Check experience
  if (input.aiInsights?.experienceScore && input.aiInsights.experienceScore < 60) {
    reasons.push('Experience level for this particular position was below the current requirement');
  }
  
  // Add competition reason
  reasons.push('High competition from other candidates in this hiring cycle');
  
  return reasons.slice(0, 3);
};

/**
 * Default improvement suggestions
 */
const getDefaultImprovements = (input: ApplicantFeedbackInput): string[] => {
  const improvements: string[] = [];
  
  // Based on gaps
  if (input.aiInsights?.gaps) {
    input.aiInsights.gaps.slice(0, 2).forEach(gap => {
      improvements.push(`Strengthen your skills in ${gap}`);
    });
  }
  
  // Based on required skills not in candidate skills
  if (input.requiredSkills.length > 0 && input.candidateSkills.length > 0) {
    const missingSkills = input.requiredSkills.filter(
      skill => !input.candidateSkills.some(cs => cs.toLowerCase().includes(skill.toLowerCase()))
    );
    missingSkills.slice(0, 2).forEach(skill => {
      improvements.push(`Gain hands-on experience with ${skill}`);
    });
  }
  
  // Add generic improvements if needed
  if (improvements.length < 3) {
    improvements.push('Build portfolio projects that demonstrate practical application of skills');
  }
  if (improvements.length < 3) {
    improvements.push('Consider contributing to open-source projects in your target domain');
  }
  
  return improvements.slice(0, 3);
};

/**
 * Default learning focus topics
 */
const getDefaultLearningFocus = (input: ApplicantFeedbackInput): string[] => {
  const learning: string[] = [];
  
  // Based on required skills
  if (input.requiredSkills.length > 0) {
    learning.push(`${input.requiredSkills[0]} fundamentals and best practices`);
    if (input.requiredSkills.length > 1) {
      learning.push(`${input.requiredSkills[1]} practical applications`);
    }
  }
  
  // Add generic learning topics
  learning.push('System design and architecture basics');
  learning.push('Technical interview preparation');
  
  return learning.slice(0, 3);
};

export default {
  generateApplicantFeedback
};
