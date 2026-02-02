/**
 * Virtual Interview Page - Complete Refactor
 * 
 * Full 10-question interview flow with:
 * - Real-time lip sync
 * - Groq-powered STT, TTS, and AI evaluation
 * - Resume-based personalized questions
 * - Per-question evaluations
 * - Final AI Readiness Score
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import '@/styles/virtual-interview.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  Mic, 
  MicOff, 
  Send,
  Trophy,
  AlertCircle,
  Play,
  MessageSquare,
  Video,
  Loader2,
  BarChart3,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Scene } from '@/components/applicant/Scene';
import { useGroqSTT } from '@/hooks/useGroqSTT';
import { useGroqTTS } from '@/hooks/useGroqTTS';
import { SyncManager } from '@/services/syncManager';
import { virtualInterviewApi, type InterviewQuestion, type InterviewSession, type FinalEvaluation } from '@/services/interviewService';
import { applicantApi } from '@/lib/api';
import type { GestureState } from '@/types/avatar';

type InterviewState = 
  | 'loading_profile'
  | 'ready'
  | 'starting'
  | 'greeting'
  | 'asking_question'
  | 'waiting_for_answer'
  | 'listening'
  | 'processing'
  | 'feedback'
  | 'completing'
  | 'completed'
  | 'error';

const VirtualInterviewInterface: React.FC = () => {
  // State management
  const [state, setState] = useState<InterviewState>('loading_profile');
  const [gestureState, setGestureState] = useState<GestureState>('idle');
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<InterviewQuestion | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [conversationHistory, setConversationHistory] = useState<Array<{ speaker: 'ai' | 'user'; message: string }>>([]);
  const [currentVisemes, setCurrentVisemes] = useState<Record<string, number> | null>(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();
  const syncManagerRef = useRef<SyncManager>(new SyncManager());

  // Custom hooks
  const {
    isRecording,
    isTranscribing,
    transcript,
    startRecording,
    stopRecording,
    clearTranscript
  } = useGroqSTT();

  const {
    isSpeaking,
    isLoading: isTTSLoading,
    speak,
    stop: stopSpeaking
  } = useGroqTTS();

  // Update gesture state
  useEffect(() => {
    if (isSpeaking) {
      setGestureState('speaking');
    } else if (isRecording) {
      setGestureState('listening');
    } else {
      setGestureState('idle');
    }
  }, [isSpeaking, isRecording]);

  // Update answer as user speaks
  useEffect(() => {
    if (transcript) {
      setUserAnswer(transcript);
    }
  }, [transcript]);

  // Setup sync manager event listeners
  useEffect(() => {
    const syncManager = syncManagerRef.current;

    const handleVisemeUpdate = (visemes: Record<string, number>) => {
      setCurrentVisemes(visemes);
    };

    syncManager.on('visemeUpdate', handleVisemeUpdate);

    return () => {
      syncManager.off('visemeUpdate', handleVisemeUpdate);
      syncManager.destroy();
    };
  }, []);

  // Load user profile on mount
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setState('loading_profile');
    try {
      const response = await applicantApi.getProfile();
      const profile = response.data;

      console.log('Profile loaded:', profile); // Debug log

      // More lenient validation - just check if profile exists
      // The backend will handle validation when generating questions
      if (!profile) {
        setHasProfile(false);
        setError('Profile not found. Please create your profile first.');
        setState('error');
      } else {
        // Profile exists - let backend handle detailed validation
        setHasProfile(true);
        setState('ready');
        
        // Optional: Show a warning if profile seems incomplete
        const hasMinimalInfo = profile.skills || profile.experience || profile.education || profile.bio;
        if (!hasMinimalInfo) {
          toast({
            title: 'Profile Notice',
            description: 'Your profile seems minimal. Consider adding more details for better question personalization.',
            variant: 'default',
          });
        }
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      setError('Failed to load your profile. Please try again.');
      setState('error');
    }
  };

  // Start interview
  const startInterview = async () => {
    setState('starting');
    setError(null);

    try {
      // Start interview session
      const response = await virtualInterviewApi.startInterview();
      
      console.log('Interview started:', response); // Debug log
      
      setSession(response.session);
      setCurrentQuestion(response.firstQuestion);
      setCurrentQuestionNumber(1);

      // Add greeting to conversation
      if (response.greeting) {
        setConversationHistory([{ speaker: 'ai', message: response.greeting }]);
        
        // Speak greeting with lip sync
        setState('greeting');
        await speakWithLipSync(response.greeting);
      }

      // After greeting, ask first question
      if (response.firstQuestion && response.firstQuestion.text) {
        setConversationHistory(prev => [...prev, { speaker: 'ai', message: response.firstQuestion.text }]);
        setState('asking_question');
        await speakWithLipSync(response.firstQuestion.text);
      } else {
        throw new Error('No question received from server');
      }

      // Ready for user answer
      setState('waiting_for_answer');

      toast({
        title: 'Interview Started!',
        description: `Question 1 of 10 - ${response.firstQuestion.category}`,
      });
    } catch (error: any) {
      console.error('Failed to start interview:', error);
      setError(error.message || 'Failed to start interview. Please try again.');
      setState('error');
      toast({
        title: 'Error',
        description: 'Failed to start interview. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Speak text with lip sync synchronization
  const speakWithLipSync = async (text: string): Promise<void> => {
    if (!text || text.trim().length === 0) {
      console.warn('Skipping TTS - empty text');
      return;
    }
    
    try {
      // For now, just use the basic TTS without lip sync
      // TODO: Integrate word-level timestamps from Groq STT for better lip sync
      await speak(text, {
        onSpeechStart: () => {
          setGestureState('speaking');
        },
        onSpeechEnd: () => {
          setGestureState('idle');
        },
      });
    } catch (error) {
      console.error('TTS error:', error);
      // Don't throw - continue interview even if TTS fails
      toast({
        title: 'Audio Playback Issue',
        description: 'Text-to-speech failed, but you can continue the interview.',
        variant: 'default',
      });
    }
  };

  // Start recording answer
  const handleStartRecording = () => {
    setState('listening');
    clearTranscript();
    setUserAnswer('');
    startRecording();
  };

  // Stop recording and wait for transcription
  const handleStopRecording = async () => {
    setState('processing');

    const result = await stopRecording();
    if (result?.text) {
      setUserAnswer(result.text);
    }

    // Return to waiting state so user can review/submit
    setState('waiting_for_answer');
  };

  // Submit answer for evaluation
  const submitAnswer = async () => {
    if (!session || !currentQuestion || !userAnswer.trim()) {
      toast({
        title: 'No Answer',
        description: 'Please record your answer before submitting.',
        variant: 'destructive',
      });
      setState('waiting_for_answer');
      return;
    }

    setState('processing');

    try {
      // Add user answer to conversation
      setConversationHistory(prev => [...prev, { speaker: 'user', message: userAnswer }]);

      // Submit answer and get evaluation
      const response = await virtualInterviewApi.respond(
        session._id,
        currentQuestionNumber,
        userAnswer,
        [] // Word timestamps from STT if needed
      );

      // Show evaluation feedback
      const scores = response.evaluation.scores || {
        technical: response.evaluation.technicalScore,
        communication: response.evaluation.communicationScore,
        confidence: response.evaluation.confidenceScore,
      };

      const feedbackText = `Great! Here's your evaluation:\n\nTechnical: ${scores.technical}/10\nCommunication: ${scores.communication}/10\nConfidence: ${scores.confidence}/10\n\n${response.evaluation.feedback}`;
      
      setConversationHistory(prev => [...prev, { speaker: 'ai', message: feedbackText }]);
      
      setState('feedback');
      await speakWithLipSync(response.evaluation.feedback);

      // Check if interview is complete
      if (response.completed && response.finalEvaluation) {
        // Interview complete
        setState('completing');
        await handleInterviewComplete(response.finalEvaluation);
      } else if (response.nextQuestion) {
        // Move to next question
        setCurrentQuestion(response.nextQuestion);
        setCurrentQuestionNumber(currentQuestionNumber + 1);
        setUserAnswer('');
        clearTranscript();

        const questionText = response.nextQuestion.text;
        setConversationHistory(prev => [...prev, { speaker: 'ai', message: questionText }]);

        setState('asking_question');
        await speakWithLipSync(questionText);

        setState('waiting_for_answer');

        toast({
          title: `Question ${currentQuestionNumber + 1} of 10`,
          description: response.nextQuestion.category,
        });
      }
    } catch (error: any) {
      console.error('Failed to submit answer:', error);
      setError(error.message || 'Failed to process your answer. Please try again.');
      setState('error');
      toast({
        title: 'Error',
        description: 'Failed to process your answer. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Handle interview completion
  const handleInterviewComplete = async (finalEvaluation: FinalEvaluation) => {
    const completionText = `Congratulations! You've completed all 10 questions. Here's your final AI Readiness Score:\n\nScore: ${finalEvaluation.aiReadinessScore}/100\nVerdict: ${finalEvaluation.verdict}\n\nOverall Feedback:\n${finalEvaluation.overallFeedback}`;

    setConversationHistory(prev => [...prev, { speaker: 'ai', message: completionText }]);
    
    await speakWithLipSync(completionText);
    
    setState('completed');

    toast({
      title: 'Interview Complete!',
      description: `Your AI Readiness Score: ${finalEvaluation.aiReadinessScore}/100`,
    });
  };

  // Reset interview
  const resetInterview = () => {
    setState('ready');
    setSession(null);
    setCurrentQuestion(null);
    setCurrentQuestionNumber(0);
    setUserAnswer('');
    setConversationHistory([]);
    setError(null);
    clearTranscript();
    stopSpeaking();
    syncManagerRef.current.stop();
  };

  // Get current evaluation scores
  const getCurrentScores = () => {
    if (!session || !session.evaluations || session.evaluations.length === 0) {
      return null;
    }

    const latestEval = session.evaluations[session.evaluations.length - 1];
    return latestEval.scores;
  };

  // Get average scores
  const getAverageScores = () => {
    if (!session || !session.evaluations || session.evaluations.length === 0) {
      return { technical: 0, communication: 0, confidence: 0 };
    }

    const sum = session.evaluations.reduce((acc, evaluation) => ({
      technical: acc.technical + evaluation.scores.technical,
      communication: acc.communication + evaluation.scores.communication,
      confidence: acc.confidence + evaluation.scores.confidence,
    }), { technical: 0, communication: 0, confidence: 0 });

    const count = session.evaluations.length;

    return {
      technical: Math.round((sum.technical / count) * 10) / 10,
      communication: Math.round((sum.communication / count) * 10) / 10,
      confidence: Math.round((sum.confidence / count) * 10) / 10,
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 p-4">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 mb-4 shadow-lg">
            <Video className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-2">
            Virtual AI Interview
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Practice your interview skills with our AI-powered interviewer. Get real-time feedback and improve your AI readiness score!
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Avatar Section */}
          <div className="space-y-6">
            <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center">
                      <Video className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">AI Interviewer</CardTitle>
                      <CardDescription className="text-sm">
                        {state === 'ready' && 'Ready to start your interview'}
                        {state === 'greeting' && 'Greeting...'}
                        {state === 'asking_question' && `Question ${currentQuestionNumber}/10`}
                        {state === 'waiting_for_answer' && 'Waiting for your answer'}
                        {state === 'listening' && 'Listening...'}
                        {state === 'processing' && 'Processing your answer...'}
                        {state === 'feedback' && 'Providing feedback...'}
                        {state === 'completed' && 'Interview Complete!'}
                      </CardDescription>
                    </div>
                  </div>
                  {session && state !== 'completed' && (
                    <Badge variant="secondary" className="text-sm">
                      {currentQuestionNumber}/10
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="relative h-[32rem] w-full rounded-b-lg overflow-hidden bg-gradient-to-b from-gray-100 to-gray-200">
                  <Scene 
                    gestureState={gestureState}
                    visemes={currentVisemes}
                    enableLipSync={isSpeaking}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none" />
                  
                  {/* Speaking indicator */}
                  {isSpeaking && (
                    <div className="absolute bottom-4 left-4 bg-blue-500 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      Speaking...
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Progress Card */}
            {session && state !== 'completed' && (
              <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Interview Progress
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Questions Completed</span>
                      <span className="font-semibold">{currentQuestionNumber - 1}/10</span>
                    </div>
                    <Progress value={((currentQuestionNumber - 1) / 10) * 100} className="h-2" />
                  </div>

                  {session.evaluations && session.evaluations.length > 0 && (
                    <div className="grid grid-cols-3 gap-3 pt-4 border-t">
                      <div className="text-center">
                        <p className="text-xs text-gray-600 mb-1">Technical</p>
                        <p className="text-2xl font-bold text-blue-600">{getAverageScores().technical}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-600 mb-1">Communication</p>
                        <p className="text-2xl font-bold text-purple-600">{getAverageScores().communication}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-600 mb-1">Confidence</p>
                        <p className="text-2xl font-bold text-green-600">{getAverageScores().confidence}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Controls Card */}
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  Interview Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {state === 'loading_profile' && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                  </div>
                )}

                {state === 'ready' && (
                  <Button 
                    onClick={startInterview} 
                    className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-12"
                    size="lg"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Start Interview (10 Questions)
                  </Button>
                )}

                {(state === 'starting' || state === 'greeting' || state === 'asking_question' || state === 'feedback' || state === 'processing' || state === 'completing') && (
                  <div className="flex items-center justify-center py-4 text-gray-600">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    {state === 'starting' && 'Starting interview...'}
                    {state === 'greeting' && 'AI interviewer greeting...'}
                    {state === 'asking_question' && 'AI asking question...'}
                    {state === 'feedback' && 'AI providing feedback...'}
                    {state === 'processing' && 'Processing your answer...'}
                    {state === 'completing' && 'Generating final score...'}
                  </div>
                )}

                {state === 'waiting_for_answer' && (
                  <div className="space-y-3">
                    {!isRecording && !userAnswer && (
                      <Button 
                        onClick={handleStartRecording}
                        className="w-full h-12 bg-blue-500 hover:bg-blue-600 text-white"
                      >
                        <Mic className="w-5 h-5 mr-2" />
                        Start Recording Answer
                      </Button>
                    )}

                    {isRecording && (
                      <Button 
                        onClick={handleStopRecording}
                        variant="destructive"
                        className="w-full h-12 animate-pulse"
                      >
                        <MicOff className="w-5 h-5 mr-2" />
                        Stop Recording
                      </Button>
                    )}

                    {userAnswer && !isRecording && (
                      <Button 
                        onClick={submitAnswer}
                        disabled={isTranscribing}
                        className="w-full h-12 bg-green-500 hover:bg-green-600 text-white"
                      >
                        <Send className="w-5 h-5 mr-2" />
                        Submit Answer
                      </Button>
                    )}
                  </div>
                )}

                {state === 'listening' && (
                  <Button 
                    onClick={handleStopRecording}
                    variant="destructive"
                    className="w-full h-12 animate-pulse"
                  >
                    <MicOff className="w-5 h-5 mr-2" />
                    Stop Recording
                  </Button>
                )}

                {state === 'completed' && (
                  <Button 
                    onClick={resetInterview} 
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white border-0 shadow-lg h-12"
                    size="lg"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Start New Interview
                  </Button>
                )}

                {state === 'error' && (
                  <Button 
                    onClick={loadProfile} 
                    variant="outline"
                    className="w-full h-12"
                  >
                    Retry
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Chat & Status Section */}
          <div className="space-y-6">
            {/* Current Answer */}
            {userAnswer && state === 'waiting_for_answer' && (
              <Card className="border-0 shadow-xl bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-blue-800">Your Answer</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-white/70 rounded-lg p-4">
                    <p className="text-sm leading-relaxed text-gray-800">{userAnswer}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Final Results */}
            {state === 'completed' && session?.finalEvaluation && (
              <Card className="border-0 shadow-xl bg-gradient-to-r from-emerald-50 to-teal-50">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl text-emerald-800 flex items-center gap-2">
                    <Trophy className="w-6 h-6 text-yellow-500" />
                    Final Interview Results
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-white/70 rounded-xl p-6 text-center">
                    <p className="text-sm text-gray-600 font-medium mb-2">AI Readiness Score</p>
                    <p className="text-5xl font-bold text-indigo-600 mb-2">
                      {session.finalEvaluation.aiReadinessScore}
                      <span className="text-2xl text-gray-400">/100</span>
                    </p>
                    <Badge 
                      className={`text-sm px-4 py-2 ${
                        session.finalEvaluation.verdict === 'strong_hire' ? 'bg-green-500 text-white' :
                        session.finalEvaluation.verdict === 'hire' ? 'bg-blue-500 text-white' :
                        session.finalEvaluation.verdict === 'maybe' ? 'bg-yellow-500 text-gray-800' :
                        'bg-red-500 text-white'
                      }`}
                    >
                      {session.finalEvaluation.verdict === 'strong_hire' && <CheckCircle2 className="w-4 h-4 mr-1 inline" />}
                      {session.finalEvaluation.verdict === 'no_hire' && <XCircle className="w-4 h-4 mr-1 inline" />}
                      {session.finalEvaluation.verdict.toUpperCase().replace('_', ' ')}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-white/70 rounded-xl p-4">
                      <p className="font-semibold text-green-800 mb-2">✅ Strengths:</p>
                      <ul className="text-sm text-gray-700 space-y-1">
                        {session.finalEvaluation.strengths.map((strength, i) => (
                          <li key={i}>• {strength}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-white/70 rounded-xl p-4">
                      <p className="font-semibold text-orange-800 mb-2">📈 Areas for Improvement:</p>
                      <ul className="text-sm text-gray-700 space-y-1">
                        {session.finalEvaluation.areasForImprovement.map((area, i) => (
                          <li key={i}>• {area}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-white/70 rounded-xl p-4">
                      <p className="font-semibold text-gray-800 mb-2">💡 Overall Feedback:</p>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {session.finalEvaluation.overallFeedback}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Error Message */}
            {state === 'error' && error && (
              <Card className="border-0 shadow-xl bg-red-50 border-l-4 border-red-500">
                <CardHeader className="pb-3">
                  <CardTitle className="text-red-800 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Error
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-red-700">{error}</p>
                </CardContent>
              </Card>
            )}

            {/* Conversation History */}
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-500" />
                  Interview Conversation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {conversationHistory.length === 0 && (
                    <p className="text-center text-gray-500 py-8">
                      Interview conversation will appear here...
                    </p>
                  )}

                  {conversationHistory.map((message, index) => (
                    <div 
                      key={index} 
                      className={`group transition-all duration-300 ${
                        message.speaker === 'ai' 
                          ? 'flex justify-start' 
                          : 'flex justify-end'
                      }`}
                    >
                      <div className={`max-w-[85%] p-4 rounded-2xl shadow-md ${
                        message.speaker === 'ai' 
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-tl-none' 
                          : 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-tr-none'
                      }`}>
                        <p className="text-xs font-semibold mb-2 opacity-80">
                          {message.speaker === 'ai' ? '🤖 AI Interviewer' : '👤 You'}
                        </p>
                        <p className="text-sm leading-relaxed whitespace-pre-line">{message.message}</p>
                      </div>
                    </div>
                  ))}

                  {(isTranscribing || state === 'processing') && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 rounded-2xl rounded-tl-none p-4 max-w-[80%] border border-gray-200">
                        <p className="text-xs font-semibold mb-2 text-blue-600">
                          {isTranscribing ? '🎤 Transcribing...' : '🤖 AI is thinking...'}
                        </p>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VirtualInterviewInterface;
