/**
 * Virtual Interview Controller
 * 
 * Handles HTTP requests for the virtual interview feature
 */

import { Request, Response } from 'express';
import { virtualInterviewService } from '../services/virtual-interview.service';
import { groqService } from '../services/groq.service';
import mongoose from 'mongoose';

/**
 * Start a new interview session
 * POST /api/virtual-interview/start
 */
export const startInterview = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized. Please login first.',
      });
    }

    const session = await virtualInterviewService.startInterview(new mongoose.Types.ObjectId(userId));

    // Get the first question
    const firstQuestion = session.questions[0];

    // Generate greeting
    const greeting = `Hello! Welcome to your virtual interview. My name is Sarah, and I'll be conducting your interview today. I'll be asking you ${session.totalQuestions} questions to evaluate your technical skills, communication, and overall readiness for ${session.targetRole || 'the role'}. Let's begin!`;

    // Generate TTS for greeting
    let greetingAudio = null;
    try {
      const ttsResult = await groqService.textToSpeech(greeting);
      greetingAudio = {
        audio: ttsResult.audioBuffer.toString('base64'),
        contentType: ttsResult.contentType,
      };
    } catch (error) {
      console.error('Failed to generate greeting audio:', error);
    }

    res.status(201).json({
      status: 'success',
      message: 'Interview session started successfully',
      data: {
        session: session,
        greeting,
        greetingAudio,
        firstQuestion: {
          number: firstQuestion.questionNumber,
          text: firstQuestion.questionText,
          category: firstQuestion.category,
          difficulty: firstQuestion.difficulty,
        },
      },
    });
  } catch (error: any) {
    console.error('Error starting interview:', error);
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to start interview session',
    });
  }
};

/**
 * Transcribe audio to text (Speech-to-Text)
 * POST /api/virtual-interview/transcribe
 */
export const transcribeAudio = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No audio file provided',
      });
    }

    const audioBuffer = req.file.buffer;
    const filename = req.file.originalname || 'audio.webm';
    const mimeType = req.file.mimetype;

    const result = await groqService.transcribe(audioBuffer, {
      filename,
      mimeType,
      includeTimestamps: true,
    });

    res.status(200).json({
      status: 'success',
      data: {
        text: result.text,
        words: result.words,
        segments: result.segments,
        language: result.language,
        duration: result.duration,
      },
    });
  } catch (error: any) {
    console.error('Error transcribing audio:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to transcribe audio',
    });
  }
};

/**
 * Submit answer and get evaluation + next question
 * POST /api/virtual-interview/respond
 */
export const submitAnswer = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { sessionId, questionNumber, answer, timestamps } = req.body;

    if (!userId) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized',
      });
    }

    if (!sessionId || questionNumber === undefined || !answer) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields: sessionId, questionNumber, answer',
      });
    }

    const userIdObj = new mongoose.Types.ObjectId(userId);

    // Get session
    const session = await virtualInterviewService.getSession(sessionId, userIdObj);
    
    if (!session) {
      return res.status(404).json({
        status: 'error',
        message: 'Interview session not found',
      });
    }

    // Save the answer
    await virtualInterviewService.saveAnswer(
      sessionId,
      userIdObj,
      questionNumber,
      answer,
      undefined, // audioUrl (optional)
      timestamps
    );

    // Get the question that was just answered
    const question = session.questions.find(q => q.questionNumber === questionNumber);
    
    if (!question) {
      return res.status(404).json({
        status: 'error',
        message: 'Question not found',
      });
    }

    // Evaluate the answer
    const evaluation = await virtualInterviewService.evaluateAnswer(
      sessionId,
      questionNumber,
      answer,
      question.questionText,
      session.resumeSnapshot
    );

    // Save the evaluation
    await virtualInterviewService.saveEvaluation(
      sessionId,
      userIdObj,
      questionNumber,
      evaluation
    );

    // Get updated session
    const updatedSession = await virtualInterviewService.getSession(sessionId, userIdObj);

    // Check if this was the last question
    const isComplete = questionNumber >= session.totalQuestions;
    let nextQuestion = null;
    let finalScore = null;

    if (!isComplete) {
      // Get next question
      const nextQ = updatedSession?.questions.find(q => q.questionNumber === questionNumber + 1);
      if (nextQ) {
        nextQuestion = {
          questionNumber: nextQ.questionNumber,
          questionText: nextQ.questionText,
          category: nextQ.category,
          difficulty: nextQ.difficulty,
        };
      }
    }

    // Prepare feedback response
    const feedbackText = `${evaluation.feedback} ${!isComplete ? "Let's move on to the next question." : "We've completed all the questions. Let me prepare your final evaluation."}`;

    // Generate TTS for feedback
    let feedbackAudio = null;
    try {
      const ttsResult = await groqService.textToSpeech(feedbackText);
      feedbackAudio = {
        audio: ttsResult.audioBuffer.toString('base64'),
        contentType: ttsResult.contentType,
      };
    } catch (error) {
      console.error('Failed to generate feedback audio:', error);
    }

    // If completed, generate final score
    if (isComplete && updatedSession) {
      try {
        finalScore = await virtualInterviewService.generateFinalEvaluation(updatedSession);
        await virtualInterviewService.completeInterview(sessionId, userIdObj, finalScore);
      } catch (error) {
        console.error('Failed to generate final evaluation:', error);
      }
    }

    res.status(200).json({
      status: 'success',
      data: {
        evaluation: {
          technicalScore: evaluation.technicalScore,
          communicationScore: evaluation.communicationScore,
          confidenceScore: evaluation.confidenceScore,
          feedback: evaluation.feedback,
        },
        feedbackText,
        feedbackAudio,
        isComplete,
        nextQuestion,
        finalScore,
        progress: {
          questionsAnswered: questionNumber,
          totalQuestions: session.totalQuestions,
        },
      },
    });
  } catch (error: any) {
    console.error('Error submitting answer:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to process answer',
    });
  }
};

/**
 * Generate speech from text (Text-to-Speech)
 * POST /api/virtual-interview/speak
 */
export const generateSpeech = async (req: Request, res: Response) => {
  try {
    const { text, voice } = req.body;

    if (!text) {
      return res.status(400).json({
        status: 'error',
        message: 'Text is required',
      });
    }

    console.log('TTS Request - Text length:', text.length, 'Voice:', voice || 'default', 'Format: wav');

    const result = await groqService.textToSpeech(text, { voice, responseFormat: 'wav' });

    console.log('TTS Success - Audio buffer size:', result.audioBuffer.length, 'Content-Type:', result.contentType);

    // Return as binary instead of base64 JSON for better browser compatibility
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Length', result.audioBuffer.length.toString());
    res.send(result.audioBuffer);
  } catch (error: any) {
    console.error('Error generating speech:', error);
    console.error('Error stack:', error.stack);
    console.error('Error message:', error.message);
    const isRateLimited =
      error?.status === 429 ||
      error?.error?.code === 'rate_limit_exceeded' ||
      error?.error?.type === 'tokens';

    const retryAfter = error?.headers?.['retry-after'];
    if (retryAfter) {
      res.setHeader('Retry-After', retryAfter);
    }

    res.status(isRateLimited ? 429 : 500).json({
      status: 'error',
      message: error.message || 'Failed to generate speech',
      details: error.toString(),
      code: error?.error?.code,
      retryAfter: retryAfter || undefined,
    });
  }
};

/**
 * Get interview session details
 * GET /api/virtual-interview/session/:sessionId
 */
export const getSession = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { sessionId } = req.params;

    if (!userId) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized',
      });
    }

    const session = await virtualInterviewService.getSession(
      sessionId,
      new mongoose.Types.ObjectId(userId)
    );

    if (!session) {
      return res.status(404).json({
        status: 'error',
        message: 'Interview session not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: { session },
    });
  } catch (error: any) {
    console.error('Error getting session:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to get interview session',
    });
  }
};

/**
 * Get user's interview history
 * GET /api/virtual-interview/history
 */
export const getInterviewHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!userId) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized',
      });
    }

    const sessions = await virtualInterviewService.getUserInterviewHistory(
      new mongoose.Types.ObjectId(userId),
      limit
    );

    res.status(200).json({
      status: 'success',
      data: { sessions },
    });
  } catch (error: any) {
    console.error('Error getting interview history:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get interview history',
    });
  }
};

/**
 * Get user's interview statistics
 * GET /api/virtual-interview/stats
 */
export const getInterviewStats = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized',
      });
    }

    const stats = await virtualInterviewService.getUserInterviewStats(
      new mongoose.Types.ObjectId(userId)
    );

    res.status(200).json({
      status: 'success',
      data: { stats },
    });
  } catch (error: any) {
    console.error('Error getting interview stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get interview statistics',
    });
  }
};

/**
 * Abandon current interview session
 * POST /api/virtual-interview/abandon/:sessionId
 */
export const abandonInterview = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { sessionId } = req.params;

    if (!userId) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized',
      });
    }

    const session = await virtualInterviewService.getSession(
      sessionId,
      new mongoose.Types.ObjectId(userId)
    );

    if (!session) {
      return res.status(404).json({
        status: 'error',
        message: 'Interview session not found',
      });
    }

    session.abandon();
    await session.save();

    res.status(200).json({
      status: 'success',
      message: 'Interview session abandoned',
      data: { session },
    });
  } catch (error: any) {
    console.error('Error abandoning interview:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to abandon interview session',
    });
  }
};
