import { GoogleGenerativeAI } from '@google/generative-ai';
import { geminiClient } from '../utils/gemini-client';

interface RejectionFeedbackInput {
  candidateName: string;
  jobTitle: string;
  skills: string[];
  requiredSkills: string[];
  aiInsights?: {
    overallScore: number;
    skillMatch: number;
    experienceScore: number;
    gaps: string[];
  };
  rejectionReason: 'skills_gap' | 'experience' | 'culture_fit' | 'overqualified' | 'position_filled' | 'custom';
  customReason?: string;
}

interface RejectionFeedback {
  subject: string;
  feedback: string;
  suggestions: string[];
  encouragement: string;
}

/**
 * Generate professional, constructive rejection feedback
 */
export const generateRejectionFeedback = async (
  input: RejectionFeedbackInput
): Promise<RejectionFeedback> => {
  try {
    return await geminiClient.executeWithFallback(async (client) => {
      const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `You are a professional HR assistant. Generate a constructive, empathetic rejection feedback for a job candidate. Be professional but encouraging.

## Context
- **Candidate Name**: ${input.candidateName}
- **Applied Position**: ${input.jobTitle}
- **Candidate Skills**: ${input.skills.join(', ') || 'Not provided'}
- **Required Skills**: ${input.requiredSkills.join(', ') || 'Not specified'}
- **Rejection Reason**: ${input.rejectionReason}${input.customReason ? ` - ${input.customReason}` : ''}
${input.aiInsights ? `
- **AI Assessment Score**: ${input.aiInsights.overallScore}%
- **Skill Match**: ${input.aiInsights.skillMatch}%
- **Experience Score**: ${input.aiInsights.experienceScore}%
- **Identified Gaps**: ${input.aiInsights.gaps.join(', ') || 'None'}
` : ''}

## Instructions
Generate a rejection feedback response in JSON format. Be:
1. Professional and respectful
2. Constructive - mention what they did well
3. Helpful - provide actionable suggestions for improvement
4. Encouraging - motivate them to keep applying

Respond ONLY with valid JSON (no markdown, no code blocks):

{
  "subject": "Brief email subject line",
  "feedback": "2-3 paragraph professional feedback explaining the decision without being harsh. Do not mention scores or percentages.",
  "suggestions": ["Specific suggestion 1", "Specific suggestion 2", "Specific suggestion 3"],
  "encouragement": "A brief encouraging closing statement"
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text().trim();

    // Parse JSON
    if (text.startsWith('```json')) {
      text = text.replace(/```json\n?/, '').replace(/```$/, '');
    } else if (text.startsWith('```')) {
      text = text.replace(/```\n?/, '').replace(/```$/, '');
    }

    const parsed = JSON.parse(text.trim());

    return {
      subject: parsed.subject || `Update on your application for ${input.jobTitle}`,
      feedback: parsed.feedback || getDefaultFeedback(input),
      suggestions: parsed.suggestions || getDefaultSuggestions(input),
      encouragement: parsed.encouragement || 'We encourage you to apply for future opportunities that match your profile.'
    };
    }); // End executeWithFallback
  } catch (error) {
    console.error('Error generating rejection feedback:', error);
    // Return fallback feedback
    return {
      subject: `Update on your application for ${input.jobTitle}`,
      feedback: getDefaultFeedback(input),
      suggestions: getDefaultSuggestions(input),
      encouragement: 'We appreciate your interest and encourage you to apply for future opportunities.'
    };
  }
};

/**
 * Get default feedback based on rejection reason
 */
const getDefaultFeedback = (input: RejectionFeedbackInput): string => {
  const name = input.candidateName.split(' ')[0]; // First name
  
  const feedbackMap: Record<string, string> = {
    skills_gap: `Dear ${name},\n\nThank you for your interest in the ${input.jobTitle} position at our company. After careful consideration, we have decided to move forward with other candidates whose skills more closely align with the specific technical requirements for this role.\n\nWe were impressed by your background and experience. However, for this particular position, we were looking for candidates with more hands-on experience in ${input.requiredSkills.slice(0, 2).join(' and ')}.`,
    
    experience: `Dear ${name},\n\nThank you for applying for the ${input.jobTitle} position. After reviewing all applications, we have decided to proceed with candidates who have more experience at this level.\n\nWe appreciate the time you invested in your application. Your skills show promise, and we believe with more industry experience, you would be a strong candidate for similar roles in the future.`,
    
    culture_fit: `Dear ${name},\n\nThank you for your interest in joining our team as a ${input.jobTitle}. After thoughtful consideration, we have decided to move forward with other candidates.\n\nWhile your technical qualifications are solid, we felt that another candidate was a closer fit for our team dynamics and work culture at this time.`,
    
    overqualified: `Dear ${name},\n\nThank you for applying for the ${input.jobTitle} position. We were genuinely impressed by your extensive experience and qualifications.\n\nAfter careful consideration, we feel this role may not provide the level of challenge and growth opportunities that someone of your caliber deserves. We encourage you to explore more senior positions at our company.`,
    
    position_filled: `Dear ${name},\n\nThank you for your interest in the ${input.jobTitle} position. We appreciate the time and effort you put into your application.\n\nWe regret to inform you that this position has now been filled. However, we were impressed by your profile and would encourage you to apply for future openings that match your skills.`,
    
    custom: `Dear ${name},\n\nThank you for applying for the ${input.jobTitle} position. After careful review of all applications, we have decided to proceed with other candidates.\n\nWe appreciate your interest in our company and the effort you put into your application.`
  };

  return feedbackMap[input.rejectionReason] || feedbackMap.custom;
};

/**
 * Get default suggestions based on rejection reason
 */
const getDefaultSuggestions = (input: RejectionFeedbackInput): string[] => {
  const suggestionMap: Record<string, string[]> = {
    skills_gap: [
      `Consider gaining hands-on experience with ${input.requiredSkills[0] || 'the required technologies'}`,
      'Build projects that demonstrate your skills in these areas',
      'Look into relevant certifications or online courses'
    ],
    experience: [
      'Continue building your portfolio with relevant projects',
      'Seek opportunities for mentorship in your field',
      'Consider entry-level or associate roles to gain more experience'
    ],
    culture_fit: [
      'Research company culture thoroughly before interviews',
      'Prepare examples that showcase collaboration and teamwork',
      'Consider what work environment suits you best'
    ],
    overqualified: [
      'Look for senior or leadership positions that match your experience',
      'Consider roles where you can mentor others',
      'Explore positions with growth opportunities'
    ],
    position_filled: [
      'Set up job alerts for similar positions',
      'Keep your profile updated for future opportunities',
      'Network with professionals in your target industry'
    ],
    custom: [
      'Continue developing your skills',
      'Stay updated with industry trends',
      'Keep applying for positions that match your interests'
    ]
  };

  return suggestionMap[input.rejectionReason] || suggestionMap.custom;
};

/**
 * Get predefined rejection reasons for UI
 */
export const getRejectionReasons = () => [
  { value: 'skills_gap', label: 'Skills Gap', description: 'Candidate lacks some required technical skills' },
  { value: 'experience', label: 'Experience Level', description: 'Experience does not match requirements' },
  { value: 'culture_fit', label: 'Culture Fit', description: 'Not the right fit for team dynamics' },
  { value: 'overqualified', label: 'Overqualified', description: 'Candidate is overqualified for this role' },
  { value: 'position_filled', label: 'Position Filled', description: 'The position has been filled' },
  { value: 'custom', label: 'Custom Reason', description: 'Provide a custom reason' }
];

export default {
  generateRejectionFeedback,
  getRejectionReasons
};
