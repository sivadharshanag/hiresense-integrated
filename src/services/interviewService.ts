/**
 * Virtual Interview Service
 * 
 * Frontend API wrapper for virtual interview endpoints
 * Handles communication with backend virtual interview API
 */

import { getToken } from '@/lib/api';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

// Type definitions
export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

export interface InterviewQuestion {
  number: number;
  text: string;
  category: 'technical' | 'behavioral' | 'experience' | 'problem_solving' | 'career';
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface AnswerEvaluation {
  questionNumber: number;
  scores: {
    technical: number;
    communication: number;
    confidence: number;
  };
  feedback: string;
}

export interface FinalEvaluation {
  aiReadinessScore: number;
  verdict: 'strong_hire' | 'hire' | 'maybe' | 'no_hire';
  strengths: string[];
  areasForImprovement: string[];
  overallFeedback: string;
}

export interface InterviewSession {
  _id: string;
  userId: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  questions: InterviewQuestion[];
  answers: Array<{
    questionNumber: number;
    answer: string;
    wordTimestamps?: WordTimestamp[];
  }>;
  evaluations: AnswerEvaluation[];
  finalEvaluation?: FinalEvaluation;
  resumeSnapshot: any;
  startedAt: Date;
  completedAt?: Date;
}

export interface StartInterviewResponse {
  session: InterviewSession;
  greeting: string;
  firstQuestion: InterviewQuestion;
}

export interface TranscribeResponse {
  transcript: string;
  wordTimestamps: WordTimestamp[];
}

export interface RespondResponse {
  evaluation: AnswerEvaluation;
  nextQuestion?: InterviewQuestion;
  completed: boolean;
  finalEvaluation?: FinalEvaluation;
}

export interface SpeakResponse {
  audio: string; // base64 encoded audio
}

export interface SessionStatsResponse {
  totalInterviews: number;
  completedInterviews: number;
  averageScore?: number;
  latestScore?: number;
  improvementTrend?: 'improving' | 'stable' | 'declining';
}

/**
 * API Error class
 */
export class InterviewApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: any
  ) {
    super(message);
    this.name = 'InterviewApiError';
  }
}

/**
 * Base fetch wrapper with auth header
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  
  const headers: HeadersInit = {
    ...options.headers,
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  // Don't set Content-Type for FormData (browser will set it with boundary)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = 'An error occurred';
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
      throw new InterviewApiError(errorMessage, response.status, errorData);
    } catch (e) {
      if (e instanceof InterviewApiError) throw e;
      throw new InterviewApiError(errorMessage, response.status);
    }
  }

  const jsonResponse = await response.json();
  
  // Unwrap the data field from standard API response format
  if (jsonResponse && jsonResponse.data) {
    return jsonResponse.data as T;
  }
  
  return jsonResponse as T;
}

/**
 * Virtual Interview API Service
 */
export const virtualInterviewApi = {
  /**
   * Start a new interview session
   */
  async startInterview(): Promise<StartInterviewResponse> {
    return apiFetch<StartInterviewResponse>('/api/virtual-interview/start', {
      method: 'POST',
    });
  },

  /**
   * Transcribe audio to text with word timestamps
   */
  async transcribe(audioBlob: Blob): Promise<TranscribeResponse> {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');

    return apiFetch<TranscribeResponse>('/api/virtual-interview/transcribe', {
      method: 'POST',
      body: formData,
    });
  },

  /**
   * Submit answer and get evaluation + next question
   */
  async respond(
    sessionId: string,
    questionNumber: number,
    answer: string,
    wordTimestamps?: WordTimestamp[]
  ): Promise<RespondResponse> {
    return apiFetch<RespondResponse>('/api/virtual-interview/respond', {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        questionNumber,
        answer,
        wordTimestamps,
      }),
    });
  },

  /**
   * Convert text to speech (TTS)
   */
  async speak(text: string): Promise<SpeakResponse> {
    return apiFetch<SpeakResponse>('/api/virtual-interview/speak', {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  },

  /**
   * Get session details
   */
  async getSession(sessionId: string): Promise<InterviewSession> {
    return apiFetch<InterviewSession>(`/api/virtual-interview/session/${sessionId}`);
  },

  /**
   * Get user's interview history
   */
  async getHistory(): Promise<InterviewSession[]> {
    return apiFetch<InterviewSession[]>('/api/virtual-interview/history');
  },

  /**
   * Get user's interview statistics
   */
  async getStats(): Promise<SessionStatsResponse> {
    return apiFetch<SessionStatsResponse>('/api/virtual-interview/stats');
  },

  /**
   * Abandon current session
   */
  async abandonSession(sessionId: string): Promise<{ message: string }> {
    return apiFetch<{ message: string }>(`/api/virtual-interview/abandon/${sessionId}`, {
      method: 'POST',
    });
  },
};

/**
 * Combined workflow helper - transcribe + respond in one call
 */
export async function submitAnswerWithTranscription(
  audioBlob: Blob,
  sessionId: string,
  questionNumber: number
): Promise<RespondResponse> {
  // Step 1: Transcribe audio
  const { transcript, wordTimestamps } = await virtualInterviewApi.transcribe(audioBlob);
  
  // Step 2: Submit answer with timestamps
  const response = await virtualInterviewApi.respond(
    sessionId,
    questionNumber,
    transcript,
    wordTimestamps
  );
  
  return response;
}

/**
 * Combined workflow helper - speak + get audio URL
 */
export async function speakText(text: string): Promise<string> {
  const { audio } = await virtualInterviewApi.speak(text);
  
  // Convert base64 to blob URL
  const audioBlob = base64ToBlob(audio, 'audio/mpeg');
  const audioUrl = URL.createObjectURL(audioBlob);
  
  return audioUrl;
}

/**
 * Helper: Convert base64 to Blob
 */
function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, { type: mimeType });
}

export default virtualInterviewApi;
