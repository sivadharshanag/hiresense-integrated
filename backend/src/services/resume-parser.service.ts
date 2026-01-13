import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { geminiClient } from '../utils/gemini-client';

interface ParsedExperience {
  company: string;
  role: string;
  startDate: string | null;
  endDate: string | null;
  current: boolean;
  description: string;
}

interface ParsedEducation {
  degree: string;
  institution: string;
  year: string;
}

interface ParsedProject {
  name: string;
  description: string;
  techStack: string[];
}

interface ParsedResumeData {
  skills: string[];
  yearsOfExperience: number | null;
  bio: string;
  location: string | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  githubUsername: string | null;
  experiences: ParsedExperience[];
  education: ParsedEducation[];
  projects: ParsedProject[];
  certifications: string[];
  experienceText: string;
  educationText: string;
}

export class ResumeParserService {
  /**
   * Extract text from PDF buffer
   */
  async extractTextFromPDF(buffer: Buffer): Promise<string> {
    try {
      const data = await pdfParse(buffer);
      return data.text;
    } catch (error) {
      throw new Error('Failed to extract text from PDF');
    }
  }

  /**
   * Extract text from DOCX buffer
   */
  async extractTextFromDOCX(buffer: Buffer): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (error) {
      throw new Error('Failed to extract text from DOCX');
    }
  }

  /**
   * Parse resume text using Google Gemini AI
   */
  async parseResumeWithGemini(resumeText: string): Promise<ParsedResumeData> {
    try {
      // Use geminiClient with automatic key rotation and fallback
      return await geminiClient.executeWithFallback(async (client) => {
        const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const prompt = `You are an AI resume parser.

Extract structured information from the resume text below.
Return ONLY valid JSON. Do not include markdown, explanations, or comments.

Rules:
- Extract only what is explicitly present or reasonably inferred.
- Do NOT invent information.
- If a field is missing, return null or an empty value.
- Keep summaries concise and factual.
- For dates, use ISO format (YYYY-MM-DD) or at minimum YYYY-MM or YYYY.

Fields to extract:
{
  "skills": string[] (programming languages, frameworks, tools, technologies),
  "yearsOfExperience": number | null (estimate ONLY if clearly implied),
  "bio": string (2–3 sentence professional summary),
  "location": string | null (city/state if available),
  "linkedinUrl": string | null (full LinkedIn URL if found),
  "portfolioUrl": string | null (personal website/portfolio URL if found),
  "githubUsername": string | null (GitHub username only, not full URL),
  "experiences": [
    {
      "company": string,
      "role": string,
      "startDate": string | null (YYYY-MM-DD or YYYY-MM format),
      "endDate": string | null (YYYY-MM-DD or YYYY-MM format, null if current),
      "current": boolean (true if this is the current job),
      "description": string (responsibilities and achievements)
    }
  ],
  "education": [
    {
      "degree": string (e.g., "B.S. Computer Science"),
      "institution": string (university/college name),
      "year": string (graduation year)
    }
  ],
  "projects": [
    {
      "name": string,
      "description": string,
      "techStack": string[]
    }
  ],
  "certifications": string[] (list of certification names),
  "experienceText": string (all work experience as plain text for backup),
  "educationText": string (all education details as plain text for backup)
}

Resume text:
"""
${resumeText}
"""`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();

      // Clean up markdown code blocks if present
      text = text.trim();
      if (text.startsWith('```json')) {
        text = text.replace(/```json\n?/, '').replace(/```$/, '');
      } else if (text.startsWith('```')) {
        text = text.replace(/```\n?/, '').replace(/```$/, '');
      }

      const parsed = JSON.parse(text.trim());

      // Validate and sanitize experiences
      const experiences: ParsedExperience[] = Array.isArray(parsed.experiences)
        ? parsed.experiences.map((exp: any) => ({
            company: typeof exp.company === 'string' ? exp.company : '',
            role: typeof exp.role === 'string' ? exp.role : '',
            startDate: typeof exp.startDate === 'string' ? exp.startDate : null,
            endDate: typeof exp.endDate === 'string' ? exp.endDate : null,
            current: typeof exp.current === 'boolean' ? exp.current : false,
            description: typeof exp.description === 'string' ? exp.description : '',
          }))
        : [];

      // Validate and sanitize education
      const education: ParsedEducation[] = Array.isArray(parsed.education)
        ? parsed.education.map((edu: any) => ({
            degree: typeof edu.degree === 'string' ? edu.degree : '',
            institution: typeof edu.institution === 'string' ? edu.institution : '',
            year: typeof edu.year === 'string' ? edu.year : '',
          }))
        : [];

      // Validate and sanitize projects
      const projects: ParsedProject[] = Array.isArray(parsed.projects)
        ? parsed.projects.map((proj: any) => ({
            name: typeof proj.name === 'string' ? proj.name : '',
            description: typeof proj.description === 'string' ? proj.description : '',
            techStack: Array.isArray(proj.techStack) ? proj.techStack : [],
          }))
        : [];

      // Validate and sanitize
      return {
        skills: Array.isArray(parsed.skills) ? parsed.skills : [],
        yearsOfExperience: typeof parsed.yearsOfExperience === 'number' ? parsed.yearsOfExperience : null,
        bio: typeof parsed.bio === 'string' ? parsed.bio : '',
        location: typeof parsed.location === 'string' ? parsed.location : null,
        linkedinUrl: typeof parsed.linkedinUrl === 'string' ? parsed.linkedinUrl : null,
        portfolioUrl: typeof parsed.portfolioUrl === 'string' ? parsed.portfolioUrl : null,
        githubUsername: typeof parsed.githubUsername === 'string' ? parsed.githubUsername : null,
        experiences,
        education,
        projects,
        certifications: Array.isArray(parsed.certifications) ? parsed.certifications : [],
        experienceText: typeof parsed.experienceText === 'string' ? parsed.experienceText : '',
        educationText: typeof parsed.educationText === 'string' ? parsed.educationText : '',
      };
      }); // End executeWithFallback
    } catch (error: any) {
      console.error('Gemini parsing error:', error.message || error);
      
      // Provide more specific error messages
      if (error.message?.includes('API key')) {
        throw new Error('Google Gemini API key is invalid or not configured. Please check your .env file.');
      } else if (error.message?.includes('403')) {
        throw new Error('Google Gemini API access denied. Please verify your API key has the correct permissions.');
      } else if (error.message?.includes('quota')) {
        throw new Error('Google Gemini API quota exceeded. Please try again later.');
      } else if (error.message?.includes('503') || error.message?.includes('overloaded')) {
        throw new Error('AI service is temporarily busy. Please try again in a few seconds.');
      }
      
      throw new Error('Failed to parse resume with AI: ' + (error.message || 'Unknown error'));
    }
  }

  /**
   * Helper method to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Parse resume with retry logic for transient errors
   */
  private async parseResumeWithRetry(resumeText: string, maxRetries: number = 3): Promise<ParsedResumeData> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.parseResumeWithGemini(resumeText);
      } catch (error: any) {
        lastError = error;
        const isRetryable = error.message?.includes('503') || 
                           error.message?.includes('overloaded') ||
                           error.message?.includes('temporarily busy');
        
        if (isRetryable && attempt < maxRetries) {
          const waitTime = attempt * 2000; // 2s, 4s, 6s
          console.log(`🔄 Retry ${attempt}/${maxRetries} in ${waitTime/1000}s due to API overload...`);
          await this.delay(waitTime);
        } else {
          throw error;
        }
      }
    }
    
    throw lastError || new Error('Failed to parse resume after retries');
  }

  /**
   * Main method to parse resume from file buffer
   */
  async parseResume(buffer: Buffer, mimetype: string): Promise<ParsedResumeData> {
    let resumeText: string;

    // Extract text based on file type
    if (mimetype === 'application/pdf') {
      resumeText = await this.extractTextFromPDF(buffer);
    } else if (
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimetype === 'application/msword'
    ) {
      resumeText = await this.extractTextFromDOCX(buffer);
    } else {
      throw new Error('Unsupported file type. Please upload PDF or DOCX.');
    }

    if (!resumeText || resumeText.trim().length < 50) {
      throw new Error('Resume text is too short or empty');
    }

    // Parse with Gemini (with retry logic for transient errors)
    return await this.parseResumeWithRetry(resumeText);
  }
}

export default new ResumeParserService();
