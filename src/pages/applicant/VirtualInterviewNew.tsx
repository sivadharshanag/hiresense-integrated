import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  Mic, 
  MicOff, 
  Volume2,
  Clock,
  Trophy,
  AlertCircle,
  Play,
  MessageSquare,
  Video
} from 'lucide-react';
import { Scene } from '@/components/applicant/Scene';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { useWebcam } from '@/hooks/useWebcam';
import { aiService, type JobRole, type InterviewScore } from '@/services/aiService';
import type { GestureState } from '@/types/avatar';

const VirtualInterviewInterface: React.FC = () => {
  // State management
  const [interviewState, setInterviewState] = useState<'intro' | 'interviewing' | 'completed'>('intro');
  const [gestureState, setGestureState] = useState<GestureState>('idle');
  const [jobRole, setJobRole] = useState<JobRole>('software-engineer');
  const [conversationHistory, setConversationHistory] = useState<Array<{ speaker: 'ai' | 'user'; message: string }>>([]);
  const [currentResponse, setCurrentResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [interviewScore, setInterviewScore] = useState<InterviewScore | null>(null);
  
  const { toast } = useToast();
  
  // Custom hooks
  const {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    error: speechError
  } = useSpeechRecognition();
  
  const { isSpeaking, speak, stop: stopSpeaking } = useTextToSpeech();
  const { 
    videoRef, 
    isEnabled: isCameraEnabled, 
    toggleCamera,
    error: cameraError 
  } = useWebcam();

  // Update gesture state based on speech/listening
  useEffect(() => {
    if (isSpeaking) {
      setGestureState('speaking');
    } else if (isListening) {
      setGestureState('listening');
    } else {
      setGestureState('idle');
    }
  }, [isSpeaking, isListening]);

  // Update current response with transcript
  useEffect(() => {
    setCurrentResponse(transcript + interimTranscript);
  }, [transcript, interimTranscript]);

  // Start interview
  const startInterview = async () => {
    try {
      aiService.setJobRole(jobRole);
      const greeting = aiService.getGreeting();
      
      setInterviewState('interviewing');
      setConversationHistory([{ speaker: 'ai', message: greeting }]);
      
      // Speak the greeting
      speak(greeting);
      
      toast({
        title: 'Interview Started!',
        description: 'The AI interviewer will begin shortly.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to start interview. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Submit response to AI
  const submitResponse = async () => {
    if (!transcript.trim()) return;

    const userMessage = transcript.trim();
    setIsProcessing(true);
    stopListening();
    
    try {
      // Add user message to history
      setConversationHistory(prev => [...prev, { speaker: 'user', message: userMessage }]);
      
      // Get AI response
      const aiResponse = await aiService.getResponse(userMessage);
      
      // Add AI response to history
      setConversationHistory(prev => [...prev, { speaker: 'ai', message: aiResponse }]);
      
      // Check if this contains an evaluation
      const score = aiService.parseEvaluation(aiResponse);
      if (score) {
        setInterviewScore(score);
        setInterviewState('completed');
      }
      
      // Speak the response
      speak(aiResponse);
      
    } catch (error) {
      console.error('Failed to get AI response:', error);
      toast({
        title: 'Error',
        description: 'Failed to process your response. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setCurrentResponse('');
    }
  };

  // Request final evaluation
  const requestEvaluation = async () => {
    setIsProcessing(true);
    
    try {
      const evaluation = await aiService.requestEvaluation();
      setConversationHistory(prev => [...prev, { speaker: 'ai', message: evaluation }]);
      
      const score = aiService.parseEvaluation(evaluation);
      if (score) {
        setInterviewScore(score);
        setInterviewState('completed');
      }
      
      speak(evaluation);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to get evaluation. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset interview
  const resetInterview = () => {
    setInterviewState('intro');
    setConversationHistory([]);
    setCurrentResponse('');
    setInterviewScore(null);
    aiService.resetConversation();
    stopSpeaking();
    stopListening();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Virtual AI Interview
          </h1>
          <p className="text-muted-foreground">
            Practice your interview skills with our AI-powered interviewer, Sarah.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Avatar Section */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="w-5 h-5" />
                  AI Interviewer - Sarah
                </CardTitle>
                <CardDescription>
                  Professional HR interviewer ready to evaluate your responses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-96 w-full">
                  <Scene gestureState={gestureState} />
                </div>
              </CardContent>
            </Card>

            {/* Controls */}
            <Card>
              <CardHeader>
                <CardTitle>Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {interviewState === 'intro' && (
                  <>
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Job Role
                      </label>
                      <select 
                        value={jobRole} 
                        onChange={(e) => setJobRole(e.target.value as JobRole)}
                        className="w-full p-2 border rounded-md"
                      >
                        {aiService.getAvailableRoles().map(role => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <Button 
                      onClick={startInterview} 
                      className="w-full"
                      size="lg"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Start Interview
                    </Button>
                  </>
                )}

                {interviewState === 'interviewing' && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Button 
                        onClick={isListening ? stopListening : startListening}
                        variant={isListening ? "destructive" : "default"}
                        disabled={isSpeaking || isProcessing}
                        className="flex-1"
                      >
                        {isListening ? <MicOff className="w-4 h-4 mr-2" /> : <Mic className="w-4 h-4 mr-2" />}
                        {isListening ? 'Stop Listening' : 'Start Speaking'}
                      </Button>
                      
                      <Button 
                        onClick={submitResponse}
                        disabled={!transcript.trim() || isProcessing || isSpeaking}
                        className="flex-1"
                      >
                        Submit Response
                      </Button>
                    </div>
                    
                    <Button 
                      onClick={requestEvaluation}
                      variant="outline"
                      disabled={isProcessing}
                      className="w-full"
                    >
                      <Trophy className="w-4 h-4 mr-2" />
                      Request Final Evaluation
                    </Button>
                  </div>
                )}

                {interviewState === 'completed' && (
                  <Button 
                    onClick={resetInterview} 
                    className="w-full"
                    size="lg"
                  >
                    Start New Interview
                  </Button>
                )}

                {/* Camera Toggle */}
                <Button 
                  onClick={toggleCamera}
                  variant="outline"
                  className="w-full"
                >
                  <Video className="w-4 h-4 mr-2" />
                  {isCameraEnabled ? 'Turn Off Camera' : 'Turn On Camera'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Chat & Controls Section */}
          <div className="space-y-4">
            {/* Your Camera */}
            {isCameraEnabled && (
              <Card>
                <CardHeader>
                  <CardTitle>Your Camera</CardTitle>
                </CardHeader>
                <CardContent>
                  <video 
                    ref={videoRef}
                    className="w-full h-48 rounded-lg bg-black"
                    autoPlay
                    muted
                    playsInline
                  />
                </CardContent>
              </Card>
            )}

            {/* Current Response */}
            {(transcript || interimTranscript) && (
              <Card>
                <CardHeader>
                  <CardTitle>Your Response</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    <span>{transcript}</span>
                    <span className="text-muted-foreground">{interimTranscript}</span>
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Interview Score */}
            {interviewScore && (
              <Card>
                <CardHeader>
                  <CardTitle>Interview Results</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Tone</p>
                      <p className="text-2xl font-bold">{interviewScore.tone}/10</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Communication</p>
                      <p className="text-2xl font-bold">{interviewScore.communication}/10</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Content</p>
                      <p className="text-2xl font-bold">{interviewScore.content}/10</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Overall</p>
                      <p className="text-2xl font-bold">{interviewScore.overall}/10</p>
                    </div>
                  </div>
                  
                  <Badge 
                    variant={
                      interviewScore.verdict === 'ACCEPT' ? 'default' : 
                      interviewScore.verdict === 'MAYBE' ? 'secondary' : 'destructive'
                    }
                    className="text-lg px-4 py-2"
                  >
                    {interviewScore.verdict}
                  </Badge>
                  
                  <div>
                    <p className="font-medium mb-2">Feedback:</p>
                    <p className="text-sm text-muted-foreground">{interviewScore.feedback}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Conversation History */}
            <Card>
              <CardHeader>
                <CardTitle>Conversation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {conversationHistory.map((message, index) => (
                    <div 
                      key={index} 
                      className={`p-3 rounded-lg ${
                        message.speaker === 'ai' 
                          ? 'bg-blue-50 border border-blue-200' 
                          : 'bg-green-50 border border-green-200'
                      }`}
                    >
                      <p className="text-xs font-medium mb-1">
                        {message.speaker === 'ai' ? 'Sarah (AI Interviewer)' : 'You'}
                      </p>
                      <p className="text-sm">{message.message}</p>
                    </div>
                  ))}
                  
                  {isProcessing && (
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">
                        Sarah is thinking...
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Error Messages */}
            {(speechError || cameraError) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-destructive">Errors</CardTitle>
                </CardHeader>
                <CardContent>
                  {speechError && (
                    <p className="text-sm text-destructive mb-2">Speech: {speechError}</p>
                  )}
                  {cameraError && (
                    <p className="text-sm text-destructive">Camera: {cameraError}</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VirtualInterviewInterface;
